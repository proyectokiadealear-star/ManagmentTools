export interface Caja {
  id: string;
  rackId: string;
  areaId: string;
  bahiaId: string;
  numero: string;
  descripcion?: string;
  tecnicoAsignadoId?: string;
  tecnicoAsignadoNombre?: string;
  capacidad?: number;
  estado: 'disponible' | 'asignada' | 'inactiva';
  createdAt: string;
  updatedAt: string;
}
