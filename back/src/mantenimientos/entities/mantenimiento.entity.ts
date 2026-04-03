export interface Mantenimiento {
  id: string;
  activoId: string;
  tipo: 'preventivo' | 'correctivo' | 'calibracion';
  descripcion: string;
  proveedorId?: string;
  proveedorNombre: string;
  costoFinal: number;
  fechaProgramada?: string;
  fechaRealizada: string;
  evidenciaUrls: string[];
  actaCalibracion?: string;
  observaciones: string;
  realizadoPor: string;
  creadoPor: string;
  fechaCreacion: string;
}
