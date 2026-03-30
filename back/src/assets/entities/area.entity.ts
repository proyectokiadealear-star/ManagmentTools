export interface Area {
  id: string;
  nombre: string;
  descripcion?: string;
  capacidad?: number;
  estado: 'activa' | 'inactiva';
  createdAt: string;
  updatedAt: string;
}
