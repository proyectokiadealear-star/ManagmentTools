export interface Bahia {
  id: string;
  areaId: string;
  nombre: string;
  descripcion?: string;
  numero: number;
  capacidad?: number;
  estado: 'activa' | 'inactiva';
  createdAt: string;
  updatedAt: string;
}
