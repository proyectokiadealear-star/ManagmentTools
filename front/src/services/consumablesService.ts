// consumablesService.ts — Real API calls via httpClient.
import { httpClient } from './httpClient';
import {
  ConsumoInsumo,
  CategoriaInsumo,
} from '../data/mockData';

// Re-export types so existing consumers keep working
export type { ConsumoInsumo, CategoriaInsumo };

// ─── EPP — Shared types ─────────────────────────────────────────────────────

export interface CatalogoEPP {
  id: string;
  nombre: string;
  tipo: string;                        // guantes-nitrilo, mascarilla-n95, calzado, overol, etc.
  frecuenciaReposicionDias: number;    // 30, 90, 180, 365
  costoUnitario: number;
  stockActual?: number;
}

export interface EntregaEPP {
  id: string;
  eppId: string;
  eppNombre: string;
  eppTipo: string;
  tecnicoId: string;
  tecnicoNombre: string;
  areaId: string;
  cantidad: number;
  loteProveedor?: string;
  fechaEntrega: string;
  proximaReposicion: string;
  esExtraordinaria: boolean;
  motivoExtraordinaria?: string;
  firmaDigitalTecnico: boolean;
  entregadoPor: string;
  entregadoPorNombre: string;
}

export interface RegistrarEntregaPayload {
  eppId: string;
  tecnicoId: string;
  tecnicoNombre: string;
  areaId: string;
  cantidad: number;
  loteProveedor?: string;
  esExtraordinaria: boolean;
  motivoExtraordinaria?: string;
  entregadoPor: string;
  entregadoPorNombre: string;
}

// ─── Insumos — Catálogo ─────────────────────────────────────────────────────

export interface CatalogoInsumo {
  id: string;
  nombre: string;
  tipo: string;                   // lubricante, filtro, pintura, etc.
  codigo: string;
  unidadMedida: string;           // litros, unidades, rollos, metros, galones
  costoUnitario: number;
  consumoPromedioPorOT: number;   // consumo histórico promedio por orden de trabajo
  stockActual?: number;
  stockMinimo?: number;
}

export async function getCatalogoInsumos(): Promise<CatalogoInsumo[]> {
  try {
    return await httpClient.get<CatalogoInsumo[]>('/api/insumos/catalogo');
  } catch {
    console.warn('[consumablesService] getCatalogoInsumos — backend no disponible');
    return [];
  }
}

export async function addCatalogoInsumo(
  data: Omit<CatalogoInsumo, 'id'>,
): Promise<CatalogoInsumo> {
  return httpClient.post<CatalogoInsumo>('/api/insumos/catalogo', data);
}

export async function updateCatalogoInsumo(
  id: string,
  data: Partial<Omit<CatalogoInsumo, 'id'>>,
): Promise<CatalogoInsumo> {
  return httpClient.patch<CatalogoInsumo>(`/api/insumos/catalogo/${encodeURIComponent(id)}`, data);
}

// ─── Insumos — Consumos ─────────────────────────────────────────────────────

export async function getConsumos(filters?: {
  otId?: string;
  tecnicoId?: string;
  areaId?: string;
}): Promise<ConsumoInsumo[]> {
  const params = new URLSearchParams();
  if (filters?.otId) params.set('otId', filters.otId);
  if (filters?.tecnicoId) params.set('tecnicoId', filters.tecnicoId);
  if (filters?.areaId) params.set('areaId', filters.areaId);
  const qs = params.toString();
  return httpClient.get<ConsumoInsumo[]>(
    `/api/insumos/consumos${qs ? `?${qs}` : ''}`,
  );
}

export async function getConsumosByOT(otId: string): Promise<ConsumoInsumo[]> {
  return httpClient.get<ConsumoInsumo[]>(
    `/api/insumos/consumos/ot/${encodeURIComponent(otId)}`,
  );
}

export async function getConsumosByTecnico(tecnico: string): Promise<ConsumoInsumo[]> {
  return httpClient.get<ConsumoInsumo[]>(
    `/api/insumos/consumos/tecnico/${encodeURIComponent(tecnico)}`,
  );
}

export async function getConsumosByArea(areaId: string): Promise<ConsumoInsumo[]> {
  try {
    return await httpClient.get<ConsumoInsumo[]>(
      `/api/insumos/consumos/area/${encodeURIComponent(areaId)}`,
    );
  } catch {
    console.warn('[consumablesService] getConsumosByArea — backend no disponible, usando mock');
    return [];
  }
}

export async function getConsumosByCategoria(categoria: CategoriaInsumo): Promise<ConsumoInsumo[]> {
  const all = await httpClient.get<ConsumoInsumo[]>('/api/insumos/consumos');
  return all.filter((c) => c.categoria === categoria);
}

export async function createConsumo(
  data: Omit<ConsumoInsumo, 'id'>,
): Promise<ConsumoInsumo> {
  return httpClient.post<ConsumoInsumo>('/api/insumos/consumo', data);
}

// ─── Insumos — Anomalías ────────────────────────────────────────────────────

export interface AnomaliaInsumo {
  record: ConsumoInsumo;
  mean: number;
  stdDev: number;
  severity: 'Alta' | 'Media';
}

export async function getAnomaliasInsumos(periodo?: string): Promise<AnomaliaInsumo[]> {
  try {
    const qs = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
    return await httpClient.get<AnomaliaInsumo[]>(`/api/insumos/anomalias${qs}`);
  } catch {
    console.warn('[consumablesService] getAnomaliasInsumos — backend no disponible');
    return [];
  }
}

// ─── EPP — Catálogo ─────────────────────────────────────────────────────────

export async function getCatalogoEPP(): Promise<CatalogoEPP[]> {
  try {
    return await httpClient.get<CatalogoEPP[]>('/api/epp/catalogo');
  } catch {
    console.warn('[consumablesService] getCatalogoEPP — backend no disponible');
    return [];
  }
}

export async function addCatalogoEPP(
  data: Omit<CatalogoEPP, 'id'>,
): Promise<CatalogoEPP> {
  return httpClient.post<CatalogoEPP>('/api/epp/catalogo', data);
}

export async function updateCatalogoEPP(
  id: string,
  data: Partial<Omit<CatalogoEPP, 'id'>>,
): Promise<CatalogoEPP> {
  return httpClient.patch<CatalogoEPP>(`/api/epp/catalogo/${encodeURIComponent(id)}`, data);
}

// ─── EPP — Entregas ─────────────────────────────────────────────────────────

export async function getEntregasEPP(filters?: {
  tecnicoId?: string;
  areaId?: string;
  tipo?: string;
}): Promise<EntregaEPP[]> {
  const params = new URLSearchParams();
  if (filters?.tecnicoId) params.set('tecnicoId', filters.tecnicoId);
  if (filters?.areaId) params.set('areaId', filters.areaId);
  if (filters?.tipo) params.set('tipo', filters.tipo);
  const qs = params.toString();
  return httpClient.get<EntregaEPP[]>(
    `/api/epp/entregas${qs ? `?${qs}` : ''}`,
  );
}

export async function getEntregasEPPPendientes(): Promise<EntregaEPP[]> {
  try {
    return await httpClient.get<EntregaEPP[]>('/api/epp/entregas/pendientes');
  } catch {
    console.warn('[consumablesService] getEntregasEPPPendientes — backend no disponible');
    return [];
  }
}

export interface CalendarioEntregaEPP {
  dia: string;
  entregas: EntregaEPP[];
}

export async function getCalendarioEntregasEPP(): Promise<CalendarioEntregaEPP[]> {
  try {
    return await httpClient.get<CalendarioEntregaEPP[]>('/api/epp/entregas/calendario');
  } catch {
    console.warn('[consumablesService] getCalendarioEntregasEPP — backend no disponible');
    return [];
  }
}

export async function createEntregaEPP(
  data: RegistrarEntregaPayload,
): Promise<EntregaEPP> {
  return httpClient.post<EntregaEPP>('/api/epp/entrega', data);
}

// ─── EPP — Comparativa ──────────────────────────────────────────────────────

export interface ComparativaEPP {
  tecnico: string;
  area: string;
  total: number;
  promedio: number;
  desviacionPct: number;
}

export async function getComparativaEPP(filters?: {
  areaId?: string;
  periodo?: string;
}): Promise<ComparativaEPP[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.areaId) params.set('areaId', filters.areaId);
    if (filters?.periodo) params.set('periodo', filters.periodo);
    const qs = params.toString();
    return await httpClient.get<ComparativaEPP[]>(
      `/api/epp/comparativa${qs ? `?${qs}` : ''}`,
    );
  } catch {
    console.warn('[consumablesService] getComparativaEPP — backend no disponible');
    return [];
  }
}
