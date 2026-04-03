export type EstadoFalla = 'reportada' | 'evaluando' | 'en_reparacion' | 'reparada' | 'descartada';
export type DecisionFalla = 'reparar_inmediato' | 'cotizar' | 'reemplazar';

export interface Falla {
  id: string;
  activoId: string;
  activoNombre: string;
  descripcionSintomas: string;
  fotografiaUrl?: string;
  impactoOperativo: string;
  reportadoPor: string;
  reportadoPorNombre: string;
  fechaDeteccion: string;
  fechaReporte: string;
  estado: EstadoFalla;
  decision?: DecisionFalla;
  cotizacionId?: string;
  tiempoRespuestaGerencia?: number;
  tiempoTotalParada?: number;
  costoFalla?: number;
  causaRaiz?: string;
  evidenciaPostUrl?: string;
  reparadoPor?: string;
  fechaReparacion?: string;
  fechaCierre?: string;
}
