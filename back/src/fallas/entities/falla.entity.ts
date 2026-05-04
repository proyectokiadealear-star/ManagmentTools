export type EstadoFalla = 'reportada' | 'evaluando' | 'en_reparacion' | 'reparada' | 'descartada';
export type DecisionFalla = 'reparar_inmediato' | 'cotizar' | 'reemplazar';
export type UrgenciaFalla = 'critica' | 'alta' | 'media' | 'baja';
export type TipoFalla = 'electrica' | 'mecanica' | 'hidraulica' | 'neumática' | 'estructural' | 'software' | 'otro';

export interface Falla {
  id: string;
  codigoFalla?: string;
  activoId: string;
  activoNombre: string;
  activoCodigo?: string;
  activoPlaca?: string;
  descripcionSintomas: string;
  fotografiaUrls?: string[];
  impactoOperativo: string;
  urgencia: UrgenciaFalla;
  tipoFalla?: TipoFalla;
  reportadoPor: string;
  reportadoPorNombre: string;
  fechaDeteccion: string;
  fechaReporte: string;
  horaDeteccion?: string;
  estado: EstadoFalla;
  decision?: DecisionFalla;
  cotizacionId?: string;
  
  // Tiempos de respuesta (en minutos)
  tiempoDeteccionAReporte?: number;
  tiempoReporteARespuestaGerencia?: number;
  tiempoRespuestaAInicioReparacion?: number;
  tiempoTotalParada?: number;
  
  // Respuesta de gerencia
  respuestaGerencia?: string;
  fechaRespuestaGerencia?: string;
  slaCumple?: boolean;
  
  // Costos
  costoRepuestos?: number;
  costoManoObra?: number;
  costoFalla?: number;
  costoTotal?: number;
  
  // Reparación
  causaRaiz?: string;
  accionCorrectiva?: string;
  evidenciaPostUrl?: string;
  evidenciaPostUrls?: string[];
  reparadoPor?: string;
  tiempoReparacion?: number;
  fechaReparacion?: string;
  fechaInicioReparacion?: string;
  fechaCierre?: string;
  
  // Análisis y aprendizaje
  tipoFallaRepetida?: boolean;
  activosSimilaresafectados?: string[];
  sugerenciaPreventiva?: string;
  
  // Metadata
  origen?: 'correctiva' | 'preventiva';
}
