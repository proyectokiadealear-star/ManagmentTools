export interface Rack {
  id: string;
  areaId: string;
  bahiaId: string;
  nombre: string;
  descripcion?: string;
  capacidad?: number;
  estado: 'activo' | 'inactivo';
  createdAt: string;
  updatedAt: string;
}
