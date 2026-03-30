// maintenanceService.ts — Mock implementation. Swap fetch() calls for real API.

import {
  MantenimientoPreventivo,
  FallaCorrectiva,
  CotizacionRegistro,
  ProformaServicio,
  mockMantenimientos,
  mockFallasCorrectivas,
  mockCotizaciones,
} from '../data/mockData';

// ---------------------------------------------------------------------------
// Mutable runtime store
// ---------------------------------------------------------------------------

let _mantenimientos: MantenimientoPreventivo[] = [...mockMantenimientos];
let _fallas: FallaCorrectiva[] = [...mockFallasCorrectivas];
let _cotizaciones: CotizacionRegistro[] = [...mockCotizaciones];

// ---------------------------------------------------------------------------
// Mantenimientos Preventivos
// ---------------------------------------------------------------------------

export async function getMantenimientos(): Promise<MantenimientoPreventivo[]> {
  return _mantenimientos.map((m) => ({ ...m }));
}

export async function getMantenimientoById(
  id: string
): Promise<MantenimientoPreventivo | undefined> {
  const item = _mantenimientos.find((m) => m.id === id);
  return item ? { ...item } : undefined;
}

export async function updateMantenimiento(
  id: string,
  data: Partial<MantenimientoPreventivo>
): Promise<MantenimientoPreventivo> {
  const index = _mantenimientos.findIndex((m) => m.id === id);
  if (index === -1) {
    throw new Error(`Mantenimiento con id "${id}" no encontrado.`);
  }
  _mantenimientos[index] = { ..._mantenimientos[index], ...data };
  return { ..._mantenimientos[index] };
}

export async function marcarEjecutado(
  id: string,
  observacion?: string
): Promise<MantenimientoPreventivo> {
  const index = _mantenimientos.findIndex((m) => m.id === id);
  if (index === -1) {
    throw new Error(`Mantenimiento con id "${id}" no encontrado.`);
  }
  _mantenimientos[index] = {
    ..._mantenimientos[index],
    ejecutado: true,
    ...(observacion !== undefined ? { observacion } : {}),
  };
  return { ..._mantenimientos[index] };
}

// ---------------------------------------------------------------------------
// Fallas Correctivas
// ---------------------------------------------------------------------------

export async function getFallas(): Promise<FallaCorrectiva[]> {
  return _fallas.map((f) => ({ ...f }));
}

export async function getFallaById(
  id: string
): Promise<FallaCorrectiva | undefined> {
  const item = _fallas.find((f) => f.id === id);
  return item ? { ...item } : undefined;
}

export async function createFalla(
  data: Omit<FallaCorrectiva, 'id'>
): Promise<FallaCorrectiva> {
  const newFalla: FallaCorrectiva = {
    ...data,
    id: `FC${Date.now()}`,
  };
  _fallas = [..._fallas, newFalla];
  return { ...newFalla };
}

export async function updateFalla(
  id: string,
  data: Partial<FallaCorrectiva>
): Promise<FallaCorrectiva> {
  const index = _fallas.findIndex((f) => f.id === id);
  if (index === -1) {
    throw new Error(`Falla correctiva con id "${id}" no encontrada.`);
  }
  _fallas[index] = { ..._fallas[index], ...data };
  return { ..._fallas[index] };
}

// ---------------------------------------------------------------------------
// Cotizaciones
// ---------------------------------------------------------------------------

export async function getCotizaciones(): Promise<CotizacionRegistro[]> {
  return _cotizaciones.map((c) => ({ ...c }));
}

export async function createCotizacion(
  data: Omit<CotizacionRegistro, 'id'>
): Promise<CotizacionRegistro> {
  const newCotizacion: CotizacionRegistro = {
    ...data,
    id: `COT${Date.now()}`,
  };
  _cotizaciones = [..._cotizaciones, newCotizacion];
  return { ...newCotizacion };
}

export async function addProformaToFalla(
  fallaId: string,
  proforma: Omit<ProformaServicio, 'id'>
): Promise<FallaCorrectiva> {
  const index = _fallas.findIndex((f) => f.id === fallaId);
  if (index === -1) {
    throw new Error(`Falla correctiva con id "${fallaId}" no encontrada.`);
  }
  const newProforma: ProformaServicio = {
    ...proforma,
    id: `PRF${Date.now()}`,
  };
  _fallas[index] = {
    ..._fallas[index],
    proformas: [...(_fallas[index].proformas ?? []), newProforma],
  };
  return { ..._fallas[index] };
}

export async function addProformaToMantenimiento(
  mantenimientoId: string,
  proforma: Omit<ProformaServicio, 'id'>
): Promise<MantenimientoPreventivo> {
  const index = _mantenimientos.findIndex((m) => m.id === mantenimientoId);
  if (index === -1) {
    throw new Error(
      `Mantenimiento con id "${mantenimientoId}" no encontrado.`
    );
  }
  const newProforma: ProformaServicio = {
    ...proforma,
    id: `PRF${Date.now()}`,
  };
  _mantenimientos[index] = {
    ..._mantenimientos[index],
    proformas: [...(_mantenimientos[index].proformas ?? []), newProforma],
  };
  return { ..._mantenimientos[index] };
}

export async function seleccionarProformaFalla(
  fallaId: string,
  proformaId: string
): Promise<FallaCorrectiva> {
  const index = _fallas.findIndex((f) => f.id === fallaId);
  if (index === -1) {
    throw new Error(`Falla correctiva con id "${fallaId}" no encontrada.`);
  }
  const updatedProformas = (_fallas[index].proformas ?? []).map((p) => ({
    ...p,
    seleccionada: p.id === proformaId,
  }));
  _fallas[index] = { ..._fallas[index], proformas: updatedProformas };
  return { ..._fallas[index] };
}
