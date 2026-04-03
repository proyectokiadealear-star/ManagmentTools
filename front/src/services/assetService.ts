// assetService.ts — API REST
import { Asset } from '../data/mockData';
import { environment } from '../environments/environment';
import { AreaTaller, Sede } from '../shared/types/enums';
import { httpClient } from './httpClient';
import { auth } from '../config/firebase';

const API_URL = environment.apiUrl || 'http://localhost:3000';

// Tipos del backend — mirrors Activo entity
export interface ActivoAPI {
  id: string;
  nombre: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  serial?: string;
  placa?: string;
  codigo?: string;
  factura?: string;
  encargado?: string;
  comentario?: string;
  proveedor?: string;
  fechaCompra?: string;
  valor?: number;
  valorActual?: number;
  vidaUtil?: number;
  capacidadEspecificacion?: string;
  periodicidad?: string;
  itemProveedor?: string;
  areaId: string;
  bahiaId: string;
  rackId: string;
  cajaId?: string;
  responsable?: string;
  custodio?: string;
  estado: string;
  estadoOperativo: 'disponible' | 'en-prestamo' | 'en-mantenimiento' | 'danado';
  observacion?: string;
  especificaciones?: string;
  capacidad?: string;
  imagenUrl?: string;
  createdAt: string;
  updatedAt: string;
  usuarioId?: string;
}

export interface SearchParams {
  q?: string;
  tipo?: string;
  capacidad?: string;
  estado?: string;
  estadoOperativo?: string;
  areaId?: string;
}

export interface EstadisticasResponse {
  total: number;
  enCajasPersonales: number;
  enUbicacionesFijas: number;
  enPrestamo: number;
  enMantenimiento: number;
  danados: number;
  disponibles: number;
}

export interface DisponibilidadResponse {
  id: string;
  disponible: boolean;
  estadoOperativo: string;
  mensaje: string;
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

/**
 * Maps backend ActivoAPI fields to frontend Asset shape.
 * Provides safe defaults for every field so nothing crashes on `.toLowerCase()` etc.
 *
 * Key differences:
 *  - backend `nombre`  → frontend `descripcion`
 *  - backend `areaId`  → frontend `area` (AreaTaller enum key, or undefined)
 *  - backend `bahiaId` → frontend `bahia`
 *  - backend `rackId`  → frontend `rack`
 *  - backend `cajaId`  → frontend `caja`
 */
export function mapActivoToAsset(a: ActivoAPI): Asset {
  // Try to resolve areaId → AreaTaller enum.
  // If areaId already IS an enum key (e.g. "TALLER") use it directly.
  // Otherwise leave undefined so the "texto libre" branch renders.
  const areaEnum = Object.values(AreaTaller).includes(a.areaId as AreaTaller)
    ? (a.areaId as AreaTaller)
    : undefined;

  // Map estadoOperativo → frontend estado label
  const estadoMap: Record<string, 'Activo' | 'En Reparación' | 'Dado de Baja'> = {
    disponible:        'Activo',
    'en-prestamo':     'Activo',
    'en-mantenimiento':'En Reparación',
    danado:            'Dado de Baja',
  };
  const estado = estadoMap[a.estadoOperativo ?? 'disponible'] ?? 'Activo';

  return {
    id:                      a.id ?? '',
    codigo:                  a.codigo ?? a.placa ?? a.serial ?? a.id ?? '',
    descripcion:             a.nombre ?? '',
    tipo:                    (a.tipo as Asset['tipo']) ?? 'Equipo',
    marca:                   a.marca ?? '',
    modelo:                  a.modelo ?? '',
    serial:                  a.serial ?? '',
    placa:                   a.placa ?? '',
    proveedor:               a.proveedor ?? '',
    factura:                 a.factura ?? '',
    fechaCompra:             a.fechaCompra ?? '',
    valor:                   a.valor ?? a.valorActual ?? 0,
    ubicacion:               a.areaId ?? '',
    area:                    areaEnum,
    bahia:                   a.bahiaId ?? undefined,
    rack:                    a.rackId ?? undefined,
    caja:                    a.cajaId ?? undefined,
    responsable:             a.responsable ?? '',
    custodio:                a.custodio ?? '',
    encargado:               a.encargado ?? a.custodio ?? '',
    estado,
    vidaUtil:                a.vidaUtil ?? 5, // default 5 years to avoid division by zero in depreciation
    observacion:             a.observacion ?? '',
    comentario:              a.comentario ?? '',
    itemProveedor:           a.itemProveedor ?? '',
    capacidadEspecificacion: a.capacidadEspecificacion ?? a.capacidad ?? a.especificaciones ?? '',
    periodicidad:            a.periodicidad ?? '',
    imagenUrl:               a.imagenUrl,
  };
}

// ==================== ASSETS ====================

export async function getAssets(): Promise<Asset[]> {
  const data = await httpClient.get<ActivoAPI[]>('/api/activos');
  return data.map(mapActivoToAsset);
}

export async function getAssetById(id: string): Promise<Asset | undefined> {
  const data = await httpClient.get<ActivoAPI>(`/api/activos/${id}`);
  return mapActivoToAsset(data);
}

export async function createAsset(data: Omit<Asset, 'id'>): Promise<Asset> {
  return mapActivoToAsset(await httpClient.post<ActivoAPI>('/api/activos', data));
}

export async function updateAsset(id: string, data: Partial<Asset>): Promise<Asset> {
  return mapActivoToAsset(await httpClient.patch<ActivoAPI>(`/api/activos/${id}`, data));
}

export async function deleteAsset(id: string): Promise<void> {
  await httpClient.delete(`/api/activos/${id}`);
}

export async function transferirActivo(
  id: string,
  data: { areaId: string; bahiaId: string; rackId: string; cajaId?: string; motivo: string }
): Promise<Asset> {
  try {
    return mapActivoToAsset(await httpClient.post<ActivoAPI>(`/api/activos/${id}/transferir`, data));
  } catch {
    throw new Error('Transferencia solo disponible con backend conectado');
  }
}

export async function getMovimientos(activoId: string): Promise<MovimientoAPI[]> {
  try {
    return await httpClient.get<MovimientoAPI[]>(`/api/activos/${activoId}/movimientos`);
  } catch {
    return [];
  }
}

// ==================== CATÁLOGO VISUAL ====================

export async function searchAssets(params: SearchParams): Promise<ActivoAPI[]> {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return httpClient.get<ActivoAPI[]>(`/api/activos/buscar?${query}`);
}

export async function getEstadisticas(): Promise<EstadisticasResponse> {
  return httpClient.get<EstadisticasResponse>('/api/activos/estadisticas');
}

export async function getDisponibilidad(id: string): Promise<DisponibilidadResponse> {
  return httpClient.get<DisponibilidadResponse>(`/api/activos/${id}/disponibilidad`);
}

export async function uploadActivoImagen(activoId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  // Build auth header manually — httpClient sets Content-Type: application/json
  // which breaks FormData uploads, so we use raw fetch here.
  const headers: Record<string, string> = {};
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken(false);
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/activos/${activoId}/imagen`, {
    method: 'POST',
    headers,
    body: formData,
    // NO poner Content-Type — el browser lo setea con el boundary correcto
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Error ${response.status} al subir imagen`);
  }

  const data = await response.json();
  return data.imagenUrl as string;
}

// ==================== LOCATIONS ====================

export interface AreaAPI {
  id: string;
  /** Clave de enum — usar para lógica de negocio */
  tipo: AreaTaller;
  /** Nombre para mostrar (ej: "Taller Mecánica") */
  nombre: string;
  sede: Sede;
  descripcion?: string;
  capacidad?: number;
  estado?: string;
}
export interface BahiaAPI { id: string; areaId: string; nombre: string; numero: number; }
export interface RackAPI { id: string; areaId: string; bahiaId: string; nombre: string; }
export interface CajaAPI { id: string; rackId: string; numero: string; estado: string; }

export async function getAreas(): Promise<AreaAPI[]> {
  return httpClient.get<AreaAPI[]>('/api/areas');
}

export async function getBahias(areaId: string): Promise<BahiaAPI[]> {
  return httpClient.get<BahiaAPI[]>(`/api/areas/${areaId}/bahias`);
}

export async function getRacks(bahiaId: string): Promise<RackAPI[]> {
  return httpClient.get<RackAPI[]>(`/api/bahias/${bahiaId}/racks`);
}

export async function getCajas(rackId: string): Promise<CajaAPI[]> {
  return httpClient.get<CajaAPI[]>(`/api/racks/${rackId}/cajas`);
}
