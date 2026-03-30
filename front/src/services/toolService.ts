// toolService.ts — Mock implementation. Swap fetch() calls for real API.

import {
  SolicitudPrestamo,
  EstadoSolicitudPrestamo,
  InspeccionFotografica,
  ActaDevolucion,
  mockPrestamos,
  mockInspecciones,
  mockActasDevolucion,
} from '../data/mockData';

// ---------------------------------------------------------------------------
// Mutable runtime store (in-memory mock state)
// ---------------------------------------------------------------------------

let _prestamos: SolicitudPrestamo[] = [...mockPrestamos];
let _inspecciones: InspeccionFotografica[] = [...mockInspecciones];
let _actas: ActaDevolucion[] = [...mockActasDevolucion];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const today = (): string => new Date().toISOString().split('T')[0];

// ---------------------------------------------------------------------------
// Préstamos (SolicitudPrestamo)
// ---------------------------------------------------------------------------

export async function getPrestamos(): Promise<SolicitudPrestamo[]> {
  return _prestamos;
}

export async function getPrestamoById(id: string): Promise<SolicitudPrestamo | undefined> {
  return _prestamos.find((p) => p.id === id);
}

export async function createPrestamo(
  data: Omit<SolicitudPrestamo, 'id'>
): Promise<SolicitudPrestamo> {
  const nuevo: SolicitudPrestamo = { id: `PR${Date.now()}`, ...data };
  _prestamos = [..._prestamos, nuevo];
  return nuevo;
}

export async function updatePrestamo(
  id: string,
  data: Partial<SolicitudPrestamo>
): Promise<SolicitudPrestamo> {
  const index = _prestamos.findIndex((p) => p.id === id);
  if (index === -1) throw new Error(`Préstamo ${id} no encontrado`);
  const actualizado: SolicitudPrestamo = { ..._prestamos[index], ...data };
  _prestamos = [
    ..._prestamos.slice(0, index),
    actualizado,
    ..._prestamos.slice(index + 1),
  ];
  return actualizado;
}

export async function aprobarPrestamo(
  id: string,
  aprobadoPor: string,
  firmaDigital: string
): Promise<SolicitudPrestamo> {
  return updatePrestamo(id, {
    estado: 'Aprobado' as EstadoSolicitudPrestamo,
    aprobadoPor,
    firmaDigital,
    fechaAprobacion: today(),
  });
}

export async function rechazarPrestamo(
  id: string,
  motivo: string
): Promise<SolicitudPrestamo> {
  return updatePrestamo(id, {
    estado: 'Rechazado' as EstadoSolicitudPrestamo,
    motivoRechazo: motivo,
  });
}

export async function registrarDevolucion(
  id: string,
  params: { estadoDevolucion: string; observacion?: string; fotoUrl?: string }
): Promise<SolicitudPrestamo> {
  return updatePrestamo(id, {
    estado: 'Devuelto' as EstadoSolicitudPrestamo,
    estadoDevolucion: params.estadoDevolucion as SolicitudPrestamo['estadoDevolucion'],
    fechaDevolucionReal: today(),
    ...(params.observacion !== undefined && { observacionDevolucion: params.observacion }),
    ...(params.fotoUrl !== undefined && { fotoDevolucionUrl: params.fotoUrl }),
  });
}

// ---------------------------------------------------------------------------
// Inspecciones Fotográficas
// ---------------------------------------------------------------------------

export async function getInspecciones(): Promise<InspeccionFotografica[]> {
  return _inspecciones;
}

export async function createInspeccion(
  data: Omit<InspeccionFotografica, 'id'>
): Promise<InspeccionFotografica> {
  const nueva: InspeccionFotografica = { id: `INS${Date.now()}`, ...data };
  _inspecciones = [..._inspecciones, nueva];
  return nueva;
}

export async function updateInspeccion(
  id: string,
  data: Partial<InspeccionFotografica>
): Promise<InspeccionFotografica> {
  const index = _inspecciones.findIndex((i) => i.id === id);
  if (index === -1) throw new Error(`Inspección ${id} no encontrada`);
  const actualizada: InspeccionFotografica = { ..._inspecciones[index], ...data };
  _inspecciones = [
    ..._inspecciones.slice(0, index),
    actualizada,
    ..._inspecciones.slice(index + 1),
  ];
  return actualizada;
}

// ---------------------------------------------------------------------------
// Actas de Devolución
// ---------------------------------------------------------------------------

export async function getActas(): Promise<ActaDevolucion[]> {
  return _actas;
}

export async function createActa(
  data: Omit<ActaDevolucion, 'id'>
): Promise<ActaDevolucion> {
  const nueva: ActaDevolucion = { id: `ACTA${Date.now()}`, ...data };
  _actas = [..._actas, nueva];
  return nueva;
}
