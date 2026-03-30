// consumablesService.ts — Mock implementation. Swap fetch() calls for real API.
import {
  ConsumoInsumo,
  CategoriaInsumo,
  EntregaEPP,
  CategoriaEPP,
  mockConsumos,
  mockEntregasEPP,
} from '../data/mockData';

let _consumos: ConsumoInsumo[] = [...mockConsumos];
let _eppEntregas: EntregaEPP[] = [...mockEntregasEPP];

// ─── Consumos de Insumos ────────────────────────────────────────────────────

export async function getConsumos(): Promise<ConsumoInsumo[]> {
  return _consumos;
}

export async function getConsumosByTecnico(tecnico: string): Promise<ConsumoInsumo[]> {
  return _consumos.filter((c) => c.tecnico === tecnico);
}

export async function getConsumosByCategoria(categoria: CategoriaInsumo): Promise<ConsumoInsumo[]> {
  return _consumos.filter((c) => c.categoria === categoria);
}

export async function createConsumo(data: Omit<ConsumoInsumo, 'id'>): Promise<ConsumoInsumo> {
  const newConsumo: ConsumoInsumo = { id: `CI${Date.now()}`, ...data };
  _consumos = [..._consumos, newConsumo];
  return newConsumo;
}

// ─── Entregas EPP ───────────────────────────────────────────────────────────

export async function getEntregasEPP(): Promise<EntregaEPP[]> {
  return _eppEntregas;
}

export async function getEntregasEPPByTecnico(tecnico: string): Promise<EntregaEPP[]> {
  return _eppEntregas.filter((e) => e.tecnico === tecnico);
}

export async function getEntregasEPPByCategoria(categoria: CategoriaEPP): Promise<EntregaEPP[]> {
  return _eppEntregas.filter((e) => e.categoria === categoria);
}

export async function createEntregaEPP(data: Omit<EntregaEPP, 'id'>): Promise<EntregaEPP> {
  const newEntrega: EntregaEPP = { id: `EPP${Date.now()}`, ...data };
  _eppEntregas = [..._eppEntregas, newEntrega];
  return newEntrega;
}
