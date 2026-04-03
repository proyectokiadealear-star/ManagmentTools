// maintenanceService.ts — Real API calls

import { httpClient } from './httpClient';
import {
  MantenimientoPreventivo,
  FallaCorrectiva,
  CotizacionRegistro,
  ProformaServicio,
} from '../data/mockData';

// ---------------------------------------------------------------------------
// Mantenimientos Preventivos
// ---------------------------------------------------------------------------

export async function getMantenimientos(): Promise<MantenimientoPreventivo[]> {
  return httpClient.get<MantenimientoPreventivo[]>('/api/mantenimientos/programacion');
}

export async function getMantenimientoById(
  id: string
): Promise<MantenimientoPreventivo | undefined> {
  return httpClient.get<MantenimientoPreventivo>(`/api/mantenimientos/${id}`);
}

export async function updateMantenimiento(
  id: string,
  data: Partial<MantenimientoPreventivo>
): Promise<MantenimientoPreventivo> {
  return httpClient.patch<MantenimientoPreventivo>(
    `/api/mantenimientos/programacion/${id}`,
    data
  );
}

export async function marcarEjecutado(
  id: string,
  observacion?: string
): Promise<MantenimientoPreventivo> {
  return httpClient.post<MantenimientoPreventivo>('/api/mantenimientos', {
    programacionId: id,
    observacion,
  });
}

// ---------------------------------------------------------------------------
// Fallas Correctivas
// ---------------------------------------------------------------------------

export async function getFallas(estado?: string): Promise<FallaCorrectiva[]> {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
  return httpClient.get<FallaCorrectiva[]>(`/api/fallas${query}`);
}

export async function getFallaById(
  id: string
): Promise<FallaCorrectiva | undefined> {
  return httpClient.get<FallaCorrectiva>(`/api/fallas/${id}`);
}

export async function createFalla(
  data: Omit<FallaCorrectiva, 'id'>
): Promise<FallaCorrectiva> {
  return httpClient.post<FallaCorrectiva>('/api/fallas', data);
}

export async function updateFalla(
  id: string,
  data: Partial<FallaCorrectiva>
): Promise<FallaCorrectiva> {
  return httpClient.patch<FallaCorrectiva>(`/api/fallas/${id}`, data);
}

export async function getFallasMetricas(): Promise<Record<string, unknown>> {
  return httpClient.get<Record<string, unknown>>('/api/fallas/metricas');
}

// ---------------------------------------------------------------------------
// Cotizaciones
// ---------------------------------------------------------------------------

export async function getCotizaciones(estado?: string): Promise<CotizacionRegistro[]> {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
  return httpClient.get<CotizacionRegistro[]>(`/api/cotizaciones${query}`);
}

export async function createCotizacion(
  data: Omit<CotizacionRegistro, 'id'>
): Promise<CotizacionRegistro> {
  return httpClient.post<CotizacionRegistro>('/api/cotizaciones', data);
}

export async function addProformaToCotizacion(
  cotizacionId: string,
  proforma: Omit<ProformaServicio, 'id'>
): Promise<CotizacionRegistro> {
  return httpClient.patch<CotizacionRegistro>(
    `/api/cotizaciones/${cotizacionId}/proforma`,
    proforma
  );
}

export async function seleccionarProforma(
  cotizacionId: string,
  indiceProforma: number
): Promise<CotizacionRegistro> {
  return httpClient.patch<CotizacionRegistro>(
    `/api/cotizaciones/${cotizacionId}/seleccionar`,
    { indiceProforma }
  );
}

export async function aprobarCotizacion(
  id: string,
  body: Record<string, unknown> = {}
): Promise<CotizacionRegistro> {
  return httpClient.patch<CotizacionRegistro>(
    `/api/cotizaciones/${id}/aprobar`,
    body
  );
}

export async function rechazarCotizacion(
  id: string,
  body: Record<string, unknown> = {}
): Promise<CotizacionRegistro> {
  return httpClient.patch<CotizacionRegistro>(
    `/api/cotizaciones/${id}/rechazar`,
    body
  );
}

export async function ejecutarCotizacion(
  id: string,
  body: Record<string, unknown> = {}
): Promise<CotizacionRegistro> {
  return httpClient.patch<CotizacionRegistro>(
    `/api/cotizaciones/${id}/ejecutar`,
    body
  );
}

// ---------------------------------------------------------------------------
// Legacy helpers (kept for backward compatibility)
// ---------------------------------------------------------------------------

export async function addProformaToFalla(
  fallaId: string,
  proforma: Omit<ProformaServicio, 'id'>
): Promise<FallaCorrectiva> {
  const falla = await getFallaById(fallaId);
  if (!falla) throw new Error(`Falla correctiva con id "${fallaId}" no encontrada.`);
  const newProforma: ProformaServicio = { ...proforma, id: `PRF${Date.now()}` };
  const updatedProformas = [...(falla.proformas ?? []), newProforma];
  return updateFalla(fallaId, { proformas: updatedProformas });
}

export async function addProformaToMantenimiento(
  mantenimientoId: string,
  proforma: Omit<ProformaServicio, 'id'>
): Promise<MantenimientoPreventivo> {
  const mant = await getMantenimientoById(mantenimientoId);
  if (!mant) throw new Error(`Mantenimiento con id "${mantenimientoId}" no encontrado.`);
  const newProforma: ProformaServicio = { ...proforma, id: `PRF${Date.now()}` };
  const updatedProformas = [...(mant.proformas ?? []), newProforma];
  return updateMantenimiento(mantenimientoId, { proformas: updatedProformas });
}

export async function seleccionarProformaFalla(
  fallaId: string,
  proformaId: string
): Promise<FallaCorrectiva> {
  const falla = await getFallaById(fallaId);
  if (!falla) throw new Error(`Falla correctiva con id "${fallaId}" no encontrada.`);
  const updatedProformas = (falla.proformas ?? []).map((p) => ({
    ...p,
    seleccionada: p.id === proformaId,
  }));
  return updateFalla(fallaId, { proformas: updatedProformas });
}
