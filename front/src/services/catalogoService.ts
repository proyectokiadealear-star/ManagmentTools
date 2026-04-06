// catalogoService.ts — CRUD catálogos (marcas, modelos, tipos, proveedores, etc.)
import { httpClient } from './httpClient';

export type CatalogoTipo =
  | 'marca'
  | 'modelo'
  | 'tipo-activo'
  | 'proveedor'
  | 'estado-activo'
  | 'estado-operativo'
  | 'tipo-mantenimiento'
  | 'causa-falla'
  | 'categoria-insumo'
  | 'categoria-epp'
  | 'estado-devolucion'
  | 'tipo-cotizacion'
  | 'sancion';

export interface CatalogoItem {
  id: string;
  catalogo: CatalogoTipo;
  nombre: string;
  parentId?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCatalogoItemPayload {
  catalogo: CatalogoTipo;
  nombre: string;
  parentId?: string;
}

export interface UpdateCatalogoItemPayload {
  nombre?: string;
  activo?: boolean;
  parentId?: string;
}

export async function getCatalogos(
  catalogo?: CatalogoTipo,
  parentId?: string,
): Promise<CatalogoItem[]> {
  const params = new URLSearchParams();
  if (catalogo) params.set('catalogo', catalogo);
  if (parentId) params.set('parentId', parentId);
  const qs = params.toString();
  return httpClient.get<CatalogoItem[]>(`/api/catalogos${qs ? `?${qs}` : ''}`);
}

export async function getCatalogoItem(id: string): Promise<CatalogoItem> {
  return httpClient.get<CatalogoItem>(`/api/catalogos/${id}`);
}

export async function createCatalogoItem(data: CreateCatalogoItemPayload): Promise<CatalogoItem> {
  return httpClient.post<CatalogoItem>('/api/catalogos', data);
}

export async function updateCatalogoItem(id: string, data: UpdateCatalogoItemPayload): Promise<CatalogoItem> {
  return httpClient.patch<CatalogoItem>(`/api/catalogos/${id}`, data);
}

export async function deleteCatalogoItem(id: string): Promise<void> {
  await httpClient.delete(`/api/catalogos/${id}`);
}
