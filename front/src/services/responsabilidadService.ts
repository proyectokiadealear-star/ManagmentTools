/**
 * responsabilidadService — API REST
 *
 * Consume los endpoints del backend de Responsabilidades.
 */
import { httpClient } from './httpClient';
import {
  PeriodoResponsabilidad,
  PersonalTaller,
} from '../data/mockData';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResultadoAsignacion =
  | { ok: true; periodo: PeriodoResponsabilidad }
  | { ok: false; razon: 'duplicado'; periodoExistente: PeriodoResponsabilidad };

/**
 * Backend returns createdAt/updatedAt on entities.
 * We strip those so the frontend PeriodoResponsabilidad type stays compatible.
 */
function normalizePeriodo(raw: any): PeriodoResponsabilidad {
  return {
    id: raw.id,
    nivel: raw.nivel,
    area: raw.area,
    caja: raw.caja,
    personalId: raw.personalId,
    personalNombre: raw.personalNombre,
    tipo: raw.tipo,
    permisos: raw.permisos,
    fechaInicio: raw.fechaInicio,
    fechaFin: raw.fechaFin,
    asignadoPor: raw.asignadoPor,
    notificacionEnviada: raw.notificacionEnviada,
    observacion: raw.observacion,
  };
}

function normalizePersonal(raw: any): PersonalTaller {
  return {
    id: raw.id,
    nombre: raw.nombre,
    cargo: raw.cargo,
    area: raw.area,
    activo: raw.activo,
  };
}

// ─── Períodos ─────────────────────────────────────────────────────────────────

export async function getResponsabilidades(): Promise<PeriodoResponsabilidad[]> {
  const data = await httpClient.get<any[]>('/api/responsabilidades');
  return data.map(normalizePeriodo);
}

export async function getActivos(): Promise<PeriodoResponsabilidad[]> {
  const data = await httpClient.get<any[]>('/api/responsabilidades/activos');
  return data.map(normalizePeriodo);
}

export async function getHistorialPorArea(area: string): Promise<PeriodoResponsabilidad[]> {
  const data = await httpClient.get<any[]>(
    `/api/responsabilidades/area/${encodeURIComponent(area)}/historial`,
  );
  return data.map(normalizePeriodo);
}

// ─── Personal ─────────────────────────────────────────────────────────────────

export async function getPersonal(): Promise<PersonalTaller[]> {
  const data = await httpClient.get<any[]>('/api/personal/activo');
  return data.map(normalizePersonal);
}

// ─── Crear / Asignar ──────────────────────────────────────────────────────────

export async function asignarResponsable(
  data: Omit<PeriodoResponsabilidad, 'id' | 'notificacionEnviada'>,
): Promise<ResultadoAsignacion> {
  const payload = {
    nivel: data.nivel,
    area: data.area,
    caja: data.caja,
    personalId: data.personalId,
    personalNombre: data.personalNombre,
    tipo: data.tipo,
    permisos: data.permisos,
    fechaInicio: data.fechaInicio,
    asignadoPor: data.asignadoPor,
    observacion: data.observacion,
  };

  const result = await httpClient.post<any>('/api/responsabilidades', payload);

  // Backend returns { ok, periodo } or { ok, razon, periodoExistente }
  if (result.ok === false) {
    return {
      ok: false,
      razon: 'duplicado',
      periodoExistente: normalizePeriodo(result.periodoExistente),
    };
  }

  const periodo = normalizePeriodo(result.periodo);
  return { ok: true, periodo };
}

// ─── Cerrar período ───────────────────────────────────────────────────────────

export async function cerrarPeriodo(id: string): Promise<PeriodoResponsabilidad> {
  const data = await httpClient.patch<any>(`/api/responsabilidades/${encodeURIComponent(id)}/cerrar`);
  return normalizePeriodo(data);
}

// ─── Reasignar ────────────────────────────────────────────────────────────────

export async function reasignarResponsable(
  idAnterior: string,
  data: Omit<PeriodoResponsabilidad, 'id' | 'notificacionEnviada'>,
): Promise<{ anterior: PeriodoResponsabilidad; nuevo: PeriodoResponsabilidad }> {
  const payload = {
    nivel: data.nivel,
    area: data.area,
    caja: data.caja,
    personalId: data.personalId,
    personalNombre: data.personalNombre,
    tipo: data.tipo,
    permisos: data.permisos,
    fechaInicio: data.fechaInicio,
    asignadoPor: data.asignadoPor,
    observacion: data.observacion,
  };

  // Backend returns { periodoAnterior, resultado }
  const result = await httpClient.post<any>(
    `/api/responsabilidades/${encodeURIComponent(idAnterior)}/reasignar`,
    payload,
  );

  const anterior = normalizePeriodo(result.periodoAnterior);

  if (result.resultado?.ok) {
    return { anterior, nuevo: normalizePeriodo(result.resultado.periodo) };
  }

  throw new Error(
    `Período anterior cerrado, pero la nueva asignación fue duplicada para ${data.area}`,
  );
}
