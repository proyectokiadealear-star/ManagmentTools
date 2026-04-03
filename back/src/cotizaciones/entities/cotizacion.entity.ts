export type EstadoCotizacion =
  | 'solicitando_proformas'
  | 'comparando'
  | 'pendiente_aprobacion'
  | 'aprobada'
  | 'rechazada'
  | 'ejecutada';

export interface Proforma {
  proveedorNombre: string;
  monto: number;
  tiempoEjecucionDias: number;
  garantiaMeses: number;
  incluyeRepuestos: boolean;
  vigenciaOfertaDias: number;
  documentoUrl?: string;
  fechaRecepcion: string;
}

export interface Cotizacion {
  id: string;
  activoId: string;
  activoNombre: string;
  fallaId?: string;
  tipo: 'preventivo_mayor' | 'correctivo';
  descripcion: string;
  montoEstimado: number;
  proformas: Proforma[];
  estado: EstadoCotizacion;
  proformaSeleccionadaIdx?: number;
  justificacionSeleccion?: string;
  justificacionDescarte?: string;
  aprobadoPor?: string;
  fechaAprobacion?: string;
  evidenciaAprobacion?: string;
  tiempoRespuestaGerencia?: number;
  costoFinalEjecutado?: number;
  solicitadoPor: string;
  fechaCreacion: string;
}
