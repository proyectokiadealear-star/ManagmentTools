// toolService.ts — Real API calls via httpClient.

import { httpClient } from './httpClient';
import {
  SolicitudPrestamo,
  EstadoSolicitudPrestamo,
  InspeccionFotografica,
  ActaDevolucion,
} from '../data/mockData';

// ---------------------------------------------------------------------------
// Prestamos (SolicitudPrestamo)
// ---------------------------------------------------------------------------

export async function getPrestamos(
  estado?: EstadoSolicitudPrestamo,
): Promise<SolicitudPrestamo[]> {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
  return httpClient.get<SolicitudPrestamo[]>(`/api/prestamos${query}`);
}

export async function getPrestamoById(
  id: string,
): Promise<SolicitudPrestamo | undefined> {
  return httpClient.get<SolicitudPrestamo>(`/api/prestamos/${id}`);
}

export async function getPrestamosByHerramienta(
  herramientaId: string,
): Promise<SolicitudPrestamo[]> {
  return httpClient.get<SolicitudPrestamo[]>(
    `/api/prestamos/herramienta/${herramientaId}`,
  );
}

export async function createPrestamo(
  data: Omit<SolicitudPrestamo, 'id'>,
): Promise<SolicitudPrestamo> {
  return httpClient.post<SolicitudPrestamo>('/api/prestamos', data);
}

export async function aprobarPrestamo(
  id: string,
  aprobadoPor: string,
  firmaDigital?: string,
): Promise<SolicitudPrestamo> {
  return httpClient.patch<SolicitudPrestamo>(
    `/api/prestamos/${id}/aprobar`,
    { aprobadoPor, firmaDigital },
  );
}

export async function rechazarPrestamo(
  id: string,
  motivo: string,
): Promise<SolicitudPrestamo> {
  return httpClient.patch<SolicitudPrestamo>(
    `/api/prestamos/${id}/rechazar`,
    { motivo },
  );
}

export async function registrarDevolucion(
  id: string,
  params: { estadoDevolucion: string; observacion?: string; fotoUrl?: string },
): Promise<SolicitudPrestamo> {
  return httpClient.patch<SolicitudPrestamo>(
    `/api/prestamos/${id}/devolucion`,
    params,
  );
}

export async function registrarRetiro(id: string): Promise<SolicitudPrestamo> {
  return httpClient.patch<SolicitudPrestamo>(
    `/api/prestamos/${id}/retiro`,
  );
}

export async function registrarDano(
  id: string,
  data: { descripcionDano: string; costoEstimado?: number; sancion?: string },
): Promise<SolicitudPrestamo> {
  return httpClient.patch<SolicitudPrestamo>(
    `/api/prestamos/${id}/dano`,
    data,
  );
}

export async function cerrarPrestamo(id: string): Promise<SolicitudPrestamo> {
  return httpClient.patch<SolicitudPrestamo>(
    `/api/prestamos/${id}/cerrar`,
  );
}

// ---------------------------------------------------------------------------
// Inspecciones Fotograficas
// ---------------------------------------------------------------------------

/**
 * Backend returns discrepancias as objects { descripcion, tipo, ... }
 * but the frontend InspeccionFotografica type expects string[].
 * This normalizer ensures the data always matches the frontend type.
 */
function normalizeInspeccion(raw: unknown): InspeccionFotografica {
  const r = raw as Record<string, unknown>;
  const discArr = Array.isArray(r.discrepancias) ? r.discrepancias : [];
  const discStrings: string[] = discArr.map((d: unknown) => {
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object' && 'descripcion' in d) return (d as { descripcion: string }).descripcion;
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
  return httpClient.patch<InspeccionFotografica>(
    `/api/inspecciones/${id}/foto`,
    data,
  );
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
