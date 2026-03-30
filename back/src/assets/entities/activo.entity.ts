export interface Activo {
  id: string;
  nombre: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  serial?: string;
  placa?: string;
  proveedor?: string;
  fechaCompra?: string;
  valor?: number;
  areaId: string;
  bahiaId: string;
  rackId: string;
  cajaId?: string;
  responsable?: string;
  custodio?: string;
  estado: 'activo' | 'inactivo' | 'en-reparacion' | 'dado-de-baja';
  observacion?: string;
  createdAt: string;
  updatedAt: string;
  usuarioId?: string;
}
