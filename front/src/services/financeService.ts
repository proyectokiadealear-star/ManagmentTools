/**
 * financeService.ts — Depreciation, repair-vs-replace & wishlist API
 */
import { httpClient } from './httpClient';
import {
  WishlistItem,
  Proforma,
} from '../data/mockData';

// ─── Types for backend responses ────────────────────────────────────────────

export interface DepreciacionActivo {
  activoId: string;
  nombre: string;
  valorOriginal: number;
  vidaUtilAnios: number;
  aniosTranscurridos: number;
  depreciacionAnual: number;
  depreciacionAcumulada: number;
  valorActual: number;
  porcentajeDepreciado: number;
  fechaCompra: string;
}

export interface DepreciacionBulkResponse {
  activos: DepreciacionActivo[];
  totalValorOriginal: number;
  totalValorActual: number;
  totalDepreciacionAcumulada: number;
}

export interface RepararVsReemplazarRequest {
  activoId: string;
  costoReparacion: number;
  costoReemplazo?: number;
}

export interface RepararVsReemplazarResponse {
  activoId: string;
  nombre: string;
  valorActual: number;
  costoReparacion: number;
  costoReemplazo: number;
  porcentajeReparacionVsValor: number;
  recomendacion: 'reparar' | 'evaluar_reemplazo' | 'reemplazar' | 'reemplazar_definitivo';
  alertaNivel: 'verde' | 'amarillo' | 'rojo';
  razon: string;
}

// ─── Depreciation API ───────────────────────────────────────────────────────

export async function getDepreciacionBulk(): Promise<DepreciacionBulkResponse> {
  try {
    return await httpClient.get<DepreciacionBulkResponse>('/api/finanzas/depreciacion');
  } catch {
    console.warn('[financeService] Backend no disponible — retornando depreciación vacía');
    return { activos: [], totalValorOriginal: 0, totalValorActual: 0, totalDepreciacionAcumulada: 0 };
  }
}

export async function getDepreciacionByActivo(activoId: string): Promise<DepreciacionActivo | null> {
  try {
    return await httpClient.get<DepreciacionActivo>(`/api/finanzas/depreciacion/${encodeURIComponent(activoId)}`);
  } catch {
    console.warn(`[financeService] Error obteniendo depreciación de ${activoId}`);
    return null;
  }
}

export async function getActivosPorDepreciar(): Promise<DepreciacionActivo[]> {
  try {
    return await httpClient.get<DepreciacionActivo[]>('/api/finanzas/activos-por-depreciar');
  } catch {
    console.warn('[financeService] Backend no disponible — retornando lista vacía');
    return [];
  }
}

// ─── Repair vs Replace API ──────────────────────────────────────────────────

export async function evaluarRepararVsReemplazar(
  body: RepararVsReemplazarRequest,
): Promise<RepararVsReemplazarResponse | null> {
  try {
    return await httpClient.post<RepararVsReemplazarResponse>('/api/finanzas/reparar-vs-reemplazar', body);
  } catch {
    console.warn('[financeService] Error evaluando reparar vs reemplazar');
    return null;
  }
}

// ─── Wishlist API ───────────────────────────────────────────────────────────

export async function getWishlist(): Promise<WishlistItem[]> {
  try {
    return await httpClient.get<WishlistItem[]>('/api/finanzas/wishlist');
  } catch {
    return [];
  }
}

export async function getWishlistItemById(id: string): Promise<WishlistItem | undefined> {
  return httpClient.get<WishlistItem>(`/api/finanzas/wishlist/${id}`);
}

export async function createWishlistItem(
  data: Omit<WishlistItem, 'id' | 'fechaSolicitud' | 'proformas'>
): Promise<WishlistItem> {
  return httpClient.post<WishlistItem>('/api/finanzas/wishlist', data);
}

export async function updateWishlistItem(
  id: string,
  data: Partial<WishlistItem>
): Promise<WishlistItem> {
  return httpClient.patch<WishlistItem>(`/api/finanzas/wishlist/${id}`, data);
}

export async function addProformaToWishlistItem(
  wishlistItemId: string,
  proforma: Omit<Proforma, 'id' | 'wishlistItemId' | 'fechaCotizacion'>
): Promise<WishlistItem> {
  return httpClient.patch<WishlistItem>(
    `/api/finanzas/wishlist/${wishlistItemId}/proforma`,
    proforma
  );
}

export async function seleccionarProformaWishlist(
  wishlistItemId: string,
  proformaId: string
): Promise<WishlistItem> {
  return httpClient.patch<WishlistItem>(
    `/api/finanzas/wishlist/${wishlistItemId}/seleccionar`,
    { proformaId }
  );
}
