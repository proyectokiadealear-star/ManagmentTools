export type EstadoPrestamo = 'pendiente' | 'aprobado' | 'en_uso' | 'devuelto' | 'devuelto_con_dano' | 'vencido' | 'rechazado';
export type EstadoDevolucion = 'bueno' | 'regular' | 'danado';

export interface Prestamo {
  id: string;
  herramientaId: string;
  herramientaNombre: string;
  herramientaPlaca: string;
  solicitanteId: string;
  solicitanteNombre: string;
  asesorId?: string;
  asesorNombre?: string;
  ordenTrabajo: string; // OT vinculada
  motivo: string;
  tiempoEstimadoHoras: number;
  aprobadorId?: string;
  aprobadorNombre?: string;
  estado: EstadoPrestamo;
  fechaSolicitud: string;
  fechaAprobacion?: string;
  fechaRetiro?: string;
  fechaDevolucionEstimada?: string;
  fechaDevolucionReal?: string;
  // Devolución
  estadoDevolucion?: EstadoDevolucion;
  funcionCompleta?: boolean;
  accesoriosCompletos?: boolean;
  limpiezaAceptable?: boolean;
  observacionesDevolucion?: string;
  fotografiaDanoUrl?: string;
  // Daño
  tipoDano?: string;
  costoReparacion?: number;
  costoReposicion?: number;
  sancion?: 'descuento_nomina' | 'reposicion' | 'reparacion_compartida';
  montoSancion?: number;
  fechaCierre?: string;
}

export interface ActaPrestamo {
  id: string;
  prestamoId: string;
  tipo: 'salida' | 'devolucion';
  herramientaDescripcion: string;
  herramientaPlaca: string;
  herramientaValorActual: number;
  solicitanteNombre: string;
  aprobadorNombre: string;
  fechaHora: string;
  condicionesResponsabilidad: string;
  firmaDigitalSolicitante: boolean;
  firmaDigitalAprobador: boolean;
  codigoQR?: string;
  observaciones?: string;
}
