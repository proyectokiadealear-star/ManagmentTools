// financeService.ts — Mock implementation. Swap fetch() calls for real API.
import {
  WishlistItem,
  Proforma,
  mockWishlist,
} from '../data/mockData';

let _wishlist: WishlistItem[] = [...mockWishlist];

// ─── Wishlist ───────────────────────────────────────────────────────────────

export async function getWishlist(): Promise<WishlistItem[]> {
  return _wishlist;
}

export async function getWishlistItemById(id: string): Promise<WishlistItem | undefined> {
  return _wishlist.find((item) => item.id === id);
}

export async function createWishlistItem(
  data: Omit<WishlistItem, 'id' | 'fechaSolicitud' | 'proformas'>
): Promise<WishlistItem> {
  const newItem: WishlistItem = {
    id: `WL${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    fechaSolicitud: new Date().toISOString().split('T')[0],
    proformas: [],
    ...data,
  };
  _wishlist = [..._wishlist, newItem];
  return newItem;
}

export async function updateWishlistItem(
  id: string,
  data: Partial<WishlistItem>
): Promise<WishlistItem> {
  const index = _wishlist.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error(`WishlistItem ${id} no encontrado`);
  }
  const updated: WishlistItem = { ..._wishlist[index], ...data };
  _wishlist = _wishlist.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function addProformaToWishlistItem(
  wishlistItemId: string,
  proforma: Omit<Proforma, 'id' | 'wishlistItemId' | 'fechaCotizacion'>
): Promise<WishlistItem> {
  const index = _wishlist.findIndex((item) => item.id === wishlistItemId);
  if (index === -1) {
    throw new Error(`WishlistItem ${wishlistItemId} no encontrado`);
  }

  const newProforma: Proforma = {
    id: `P${Date.now()}`,
    wishlistItemId,
    fechaCotizacion: new Date().toISOString().split('T')[0],
    ...proforma,
  };

  const current = _wishlist[index];
  const updated: WishlistItem = {
    ...current,
    proformas: [...current.proformas, newProforma],
    estado: current.estado === 'Pendiente' ? 'Cotizando' : current.estado,
  };

  _wishlist = _wishlist.map((item) => (item.id === wishlistItemId ? updated : item));
  return updated;
}

export async function seleccionarProforma(
  wishlistItemId: string,
  proformaId: string
): Promise<WishlistItem> {
  const index = _wishlist.findIndex((item) => item.id === wishlistItemId);
  if (index === -1) {
    throw new Error(`WishlistItem ${wishlistItemId} no encontrado`);
  }

  const current = _wishlist[index];
  const updated: WishlistItem = {
    ...current,
    estado: 'Aprobado',
    proformas: current.proformas.map((p) => ({
      ...p,
      seleccionada: p.id === proformaId,
    })),
  };

  _wishlist = _wishlist.map((item) => (item.id === wishlistItemId ? updated : item));
  return updated;
}
