// toolService.ts — Real API calls via httpClient.

import { httpClient } from './httpClient';
import {
  SolicitudPrestamo,
  EstadoSolicitudPrestamo,
  EstadoDevolucion,
  InspeccionFotografica,
  ActaDevolucion,
} from '../data/mockData';

// ---------------------------------------------------------------------------
// Backend entity type (matches NestJS Prestamo entity)
// ---------------------------------------------------------------------------

interface BackendPrestamo {
  id: string;
  herramientaId: string;
  herramientaNombre: string;
  herramientaPlaca: string;
  solicitanteId: string;
  solicitanteNombre: string;
  asesorId?: string;
  asesorNombre?: string;
  ordenTrabajo: string;
  motivo: string;
  tiempoEstimadoHoras: number;
  aprobadorId?: string;
  aprobadorNombre?: string;
  estado: 'pendiente' | 'aprobado' | 'en_uso' | 'devuelto' | 'devuelto_con_dano' | 'vencido' | 'rechazado';
  fechaSolicitud: string;
  fechaAprobacion?: string;
  fechaRetiro?: string;
  fechaDevolucionEstimada?: string;
  fechaDevolucionReal?: string;
  estadoDevolucion?: 'bueno' | 'regular' | 'danado';
  observacionesDevolucion?: string;
  fotografiaDanoUrl?: string;
  tipoDano?: string;
  costoReparacion?: number;
  costoReposicion?: number;
  sancion?: 'descuento_nomina' | 'reposicion' | 'reparacion_compartida';
  montoSancion?: number;
  fechaCierre?: string;
}

// ---------------------------------------------------------------------------
// Mappers — backend entity → frontend display model
// ---------------------------------------------------------------------------

function mapEstadoToFrontend(estado: BackendPrestamo['estado']): EstadoSolicitudPrestamo {
  switch (estado) {
    case 'pendiente': return 'Pendiente';
    case 'aprobado':
    case 'en_uso': return 'Aprobado';
    case 'devuelto':
    case 'devuelto_con_dano': return 'Devuelto';
    case 'vencido': return 'Vencido';
    case 'rechazado': return 'Rechazado';
    default: return 'Pendiente';
  }
}

function mapEstadoDevolucion(d?: BackendPrestamo['estadoDevolucion']): EstadoDevolucion | undefined {
  if (!d) return undefined;
  switch (d) {
    case 'bueno': return 'Nueva';
    case 'regular': return 'Usada Normal';
    case 'danado': return 'Dañada';
  }
}

function mapPrestamo(p: BackendPrestamo): SolicitudPrestamo {
  return {
    id: p.id,
    assetId: p.herramientaId,
    assetDescripcion: p.herramientaNombre,
    assetPlaca: p.herramientaPlaca,
    solicitante: p.solicitanteNombre,
    asesorId: p.asesorId,
    asesorNombre: p.asesorNombre,
    ordenTrabajo: p.ordenTrabajo,
    motivoUso: p.motivo,
    fechaSolicitud: p.fechaSolicitud,
    fechaAprobacion: p.fechaAprobacion,
    aprobadoPor: p.aprobadorNombre,
    firmaDigital:
      p.aprobadorNombre && p.fechaAprobacion
        ? `${p.aprobadorNombre} — ${p.fechaAprobacion.slice(0, 16).replace('T', ' ')}`
        : undefined,
    fechaSalida: p.fechaRetiro,
    fechaDevolucionEstimada: p.fechaDevolucionEstimada ?? '',
    fechaDevolucionReal: p.fechaDevolucionReal,
    estadoDevolucion: mapEstadoDevolucion(p.estadoDevolucion),
    fotoDevolucionUrl: p.fotografiaDanoUrl,
    observacionDevolucion: p.observacionesDevolucion,
    estado: mapEstadoToFrontend(p.estado),
  };
}

// ---------------------------------------------------------------------------
// Create DTO — matches backend CreatePrestamoDto
// ---------------------------------------------------------------------------

export interface CreatePrestamoData {
  herramientaId: string;
  herramientaNombre: string;
  herramientaPlaca: string;
  solicitanteId: string;
  solicitanteNombre: string;
  asesorId: string;
  asesorNombre: string;
  ordenTrabajo: string;
  motivo: string;
  tiempoEstimadoHoras: number;
}

// ---------------------------------------------------------------------------
// Prestamos (SolicitudPrestamo)
// ---------------------------------------------------------------------------

export async function getPrestamos(
  estado?: EstadoSolicitudPrestamo,
): Promise<SolicitudPrestamo[]> {
  // Map frontend capitalized estado to backend lowercase
  const backendEstado = estado?.toLowerCase();
  const query = backendEstado ? `?estado=${encodeURIComponent(backendEstado)}` : '';
  const raw = await httpClient.get<BackendPrestamo[]>(`/api/prestamos${query}`);
  return raw.map(mapPrestamo);
}

export async function getPrestamoById(
  id: string,
): Promise<SolicitudPrestamo | undefined> {
  const raw = await httpClient.get<BackendPrestamo>(`/api/prestamos/${id}`);
  return mapPrestamo(raw);
}

export async function getPrestamosByHerramienta(
  herramientaId: string,
): Promise<SolicitudPrestamo[]> {
  const raw = await httpClient.get<BackendPrestamo[]>(
    `/api/prestamos/herramienta/${herramientaId}`,
  );
  return raw.map(mapPrestamo);
}

export async function createPrestamo(data: CreatePrestamoData): Promise<SolicitudPrestamo> {
  const raw = await httpClient.post<BackendPrestamo>('/api/prestamos', data);
  return mapPrestamo(raw);
}

export async function aprobarPrestamo(
  id: string,
  aprobadorId: string,
  aprobadorNombre: string,
): Promise<SolicitudPrestamo> {
  const raw = await httpClient.patch<BackendPrestamo>(
    `/api/prestamos/${id}/aprobar`,
    { aprobadorId, aprobadorNombre },
  );
  return mapPrestamo(raw);
}

export async function rechazarPrestamo(
  id: string,
  aprobadorId: string,
  aprobadorNombre: string,
  motivo?: string,
): Promise<SolicitudPrestamo> {
  const raw = await httpClient.patch<BackendPrestamo>(
    `/api/prestamos/${id}/rechazar`,
    { aprobadorId, aprobadorNombre, motivo },
  );
  return mapPrestamo(raw);
}

export async function registrarDevolucion(
  id: string,
  params: {
    estadoDevolucion: 'bueno' | 'regular' | 'danado';
    funcionCompleta: boolean;
    accesoriosCompletos: boolean;
    limpiezaAceptable: boolean;
    observacionesDevolucion?: string;
    fotografiaDanoUrl?: string;
  },
): Promise<SolicitudPrestamo> {
  const raw = await httpClient.patch<BackendPrestamo>(
    `/api/prestamos/${id}/devolucion`,
    params,
  );
  return mapPrestamo(raw);
}

export async function registrarRetiro(id: string): Promise<SolicitudPrestamo> {
  const raw = await httpClient.patch<BackendPrestamo>(`/api/prestamos/${id}/retiro`);
  return mapPrestamo(raw);
}

export async function registrarDano(
  id: string,
  data: {
    tipoDano: string;
    sancion: 'descuento_nomina' | 'reposicion' | 'reparacion_compartida';
    costoReparacion?: number;
    costoReposicion?: number;
    montoSancion?: number;
  },
): Promise<SolicitudPrestamo> {
  const raw = await httpClient.patch<BackendPrestamo>(`/api/prestamos/${id}/dano`, data);
  return mapPrestamo(raw);
}

export async function cerrarPrestamo(id: string): Promise<SolicitudPrestamo> {
  const raw = await httpClient.patch<BackendPrestamo>(`/api/prestamos/${id}/cerrar`);
  return mapPrestamo(raw);
}

// ---------------------------------------------------------------------------
// Inspecciones Fotograficas
// ---------------------------------------------------------------------------

function normalizeInspeccion(raw: unknown): InspeccionFotografica {
  const r = raw as Record<string, unknown>;
  const discArr = Array.isArray(r.discrepancias) ? r.discrepancias : [];
  const discStrings: string[] = discArr.map((d: unknown) => {
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object' && 'descripcion' in d)
      return (d as { descripcion: string }).descripcion;
    return String(d);
  });
  return {
    ...(r as unknown as InspeccionFotografica),
    discrepancias: discStrings,
    tieneDiscrepancias: discStrings.length > 0,
  };
}

function normalizeInspecciones(raw: unknown[]): InspeccionFotografica[] {
  return raw.map(normalizeInspeccion);
}

export async function getInspecciones(
  estado?: string,
): Promise<InspeccionFotografica[]> {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
  const raw = await httpClient.get<unknown[]>(`/api/inspecciones${query}`);
  return normalizeInspecciones(raw);
}

export async function getInspeccionesPendientes(): Promise<InspeccionFotografica[]> {
  const raw = await httpClient.get<unknown[]>('/api/inspecciones/pendientes');
  return normalizeInspecciones(raw);
}

export async function createInspeccion(
  data: Omit<InspeccionFotografica, 'id'>,
): Promise<InspeccionFotografica> {
  return httpClient.post<InspeccionFotografica>('/api/inspecciones', data);
}

export async function agregarFoto(
  id: string,
  data: { fotoUrl: string; descripcion?: string },
): Promise<InspeccionFotografica> {
  return httpClient.patch<InspeccionFotografica>(`/api/inspecciones/${id}/foto`, data);
}

export async function agregarDiscrepancia(
  id: string,
  data: { descripcion: string },
): Promise<InspeccionFotografica> {
  return httpClient.patch<InspeccionFotografica>(
    `/api/inspecciones/${id}/discrepancia`,
    data,
  );
}

export async function completarInspeccion(
  id: string,
  data?: { observaciones?: string },
): Promise<InspeccionFotografica> {
  return httpClient.patch<InspeccionFotografica>(
    `/api/inspecciones/${id}/completar`,
    data ?? {},
  );
}

// ---------------------------------------------------------------------------
// Actas de Devolucion
// ---------------------------------------------------------------------------

export async function getActas(): Promise<ActaDevolucion[]> {
  // Backend has no bulk actas listing endpoint — actas are per-prestamo only
  return [];
}

export async function createActa(
  data: Omit<ActaDevolucion, 'id'>,
): Promise<ActaDevolucion> {
  return httpClient.post<ActaDevolucion>('/api/prestamos/actas', data);
}
