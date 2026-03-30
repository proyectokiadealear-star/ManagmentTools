// assetService.ts — API REST con mock fallback para desarrollo local
import { Asset } from '../data/mockData';
import { environment } from '../environments/environment';

const API_URL = environment.apiUrl || 'http://localhost:3000';

// Tipos del backend
export interface ActivoAPI {
  id: string;
  nombre: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  serial?: string;
  areaId: string;
  bahiaId: string;
  rackId: string;
  cajaId?: string;
  responsable?: string;
  custodio?: string;
  estado: string;
  createdAt: string;
  updatedAt: string;
}

export interface UbicacionAPI {
  areaId: string;
  areaNombre?: string;
  bahiaId: string;
  bahiaNombre?: string;
  rackId: string;
  rackNombre?: string;
  cajaId?: string;
  cajaNumero?: string;
}

export interface MovimientoAPI {
  id: string;
  activoId: string;
  activoNombre?: string;
  desde?: UbicacionAPI;
  hasta: UbicacionAPI;
  motivo: string;
  usuarioId: string;
  usuarioNombre?: string;
  fecha: string;
}

// Helpers
const delay = (ms = 0) => new Promise(res => setTimeout(res, ms));

// Intentar consumir API, si falla usar mock
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.warn(`API call failed, using mock: ${endpoint}`, error);
    throw error;
  }
}

// ==================== ASSETS ====================

let _assets: Asset[] = [];
let _initialized = false;

async function ensureMockData() {
  if (_initialized) return;
  const { mockAssets } = await import('../data/mockData');
  _assets = [...mockAssets];
  _initialized = true;
}

export async function getAssets(): Promise<Asset[]> {
  await delay();
  try {
    const data = await fetchAPI<ActivoAPI[]>('/api/activos');
    return data as unknown as Asset[];
  } catch {
    await ensureMockData();
    return [..._assets];
  }
}

export async function getAssetById(id: string): Promise<Asset | undefined> {
  await delay();
  try {
    const data = await fetchAPI<ActivoAPI>(`/api/activos/${id}`);
    return data as unknown as Asset;
  } catch {
    await ensureMockData();
    return _assets.find(a => a.id === id);
  }
}

export async function createAsset(data: Omit<Asset, 'id'>): Promise<Asset> {
  await delay();
  try {
    return await fetchAPI<ActivoAPI>('/api/activos', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as unknown as Asset;
  } catch {
    await ensureMockData();
    const newAsset: Asset = {
      ...data,
      id: `A${Math.floor(Math.random() * 9000) + 1000}`,
    };
    _assets = [newAsset, ..._assets];
    return newAsset;
  }
}

export async function updateAsset(id: string, data: Partial<Asset>): Promise<Asset> {
  await delay();
  try {
    return await fetchAPI<ActivoAPI>(`/api/activos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }) as unknown as Asset;
  } catch {
    await ensureMockData();
    const index = _assets.findIndex(a => a.id === id);
    if (index === -1) throw new Error(`Asset ${id} no encontrado`);
    const updated = { ..._assets[index], ...data, id };
    _assets = [..._assets.slice(0, index), updated, ..._assets.slice(index + 1)];
    return updated;
  }
}

export async function deleteAsset(id: string): Promise<void> {
  await delay();
  try {
    await fetchAPI(`/api/activos/${id}`, { method: 'DELETE' });
  } catch {
    await ensureMockData();
    _assets = _assets.filter(a => a.id !== id);
  }
}

export async function transferirActivo(
  id: string,
  data: { areaId: string; bahiaId: string; rackId: string; cajaId?: string; motivo: string }
): Promise<Asset> {
  await delay();
  try {
    return await fetchAPI<ActivoAPI>(`/api/activos/${id}/transferir`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as unknown as Asset;
  } catch {
    throw new Error('Transferencia solo disponible con backend conectado');
  }
}

export async function getMovimientos(activoId: string): Promise<MovimientoAPI[]> {
  await delay();
  try {
    return await fetchAPI<MovimientoAPI[]>(`/api/activos/${activoId}/movimientos`);
  } catch {
    return [];
  }
}

// ==================== LOCATIONS ====================

export interface AreaAPI { id: string; nombre: string; }
export interface BahiaAPI { id: string; areaId: string; nombre: string; numero: number; }
export interface RackAPI { id: string; areaId: string; bahiaId: string; nombre: string; }
export interface CajaAPI { id: string; rackId: string; numero: string; estado: string; }

export async function getAreas(): Promise<AreaAPI[]> {
  await delay();
  try {
    return await fetchAPI<AreaAPI[]>('/api/areas');
  } catch {
    // Mock básico
    return [
      { id: 'area-1', nombre: 'Mecánica' },
      { id: 'area-2', nombre: 'Enderezado' },
      { id: 'area-3', nombre: 'Pintura' },
      { id: 'area-4', nombre: 'Lavado' },
      { id: 'area-5', nombre: 'Repuestos' },
    ];
  }
}

export async function getBahias(areaId: string): Promise<BahiaAPI[]> {
  await delay();
  try {
    return await fetchAPI<BahiaAPI[]>(`/api/areas/${areaId}/bahias`);
  } catch {
    return [
      { id: 'bahia-1', areaId, nombre: 'Bahía-1', numero: 1 },
      { id: 'bahia-2', areaId, nombre: 'Bahía-2', numero: 2 },
      { id: 'bahia-3', areaId, nombre: 'Bahía-3', numero: 3 },
    ];
  }
}

export async function getRacks(bahiaId: string): Promise<RackAPI[]> {
  await delay();
  try {
    return await fetchAPI<RackAPI[]>(`/api/bahias/${bahiaId}/racks`);
  } catch {
    return [
      { id: 'rack-a', areaId: 'area-1', bahiaId, nombre: 'Rack-A' },
      { id: 'rack-b', areaId: 'area-1', bahiaId, nombre: 'Rack-B' },
    ];
  }
}

export async function getCajas(rackId: string): Promise<CajaAPI[]> {
  await delay();
  try {
    return await fetchAPI<CajaAPI[]>(`/api/racks/${rackId}/cajas`);
  } catch {
    return [
      { id: 'caja-001', rackId, numero: 'Caja-001', estado: 'disponible' },
      { id: 'caja-002', rackId, numero: 'Caja-002', estado: 'disponible' },
      { id: 'caja-003', rackId, numero: 'Caja-003', estado: 'disponible' },
    ];
  }
}
