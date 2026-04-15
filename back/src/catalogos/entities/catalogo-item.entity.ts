export type CatalogoTipo =
  | 'sede'
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
  /** Para modelos: referencia a la marca padre */
  parentId?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}
