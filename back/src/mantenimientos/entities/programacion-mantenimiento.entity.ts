export type SemaforoEstado = 'verde' | 'amarillo' | 'naranja' | 'rojo';
export type EstadoProgramacion = 'vigente' | 'vencido' | 'proximo' | 'cancelado';

export interface ProgramacionMantenimiento {
  id: string;
  activoId: string;
  activoNombre: string;
  tipo: 'preventivo' | 'calibracion';
  periodicidadDias: number;
  ultimoMantenimiento?: string;
  proximoMantenimiento: string;
  proveedorHabitual?: string;
  responsableId: string;
  responsableNombre: string;
  estado: EstadoProgramacion;
  creadoPor: string;
  fechaCreacion: string;
}

export interface ProgramacionConSemaforo extends ProgramacionMantenimiento {
  semaforo: SemaforoEstado;
  diasRestantes: number;
}
