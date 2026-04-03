export type EstadoInspeccion = 'programada' | 'en_proceso' | 'completada' | 'con_discrepancia';
export type ResultadoDiscrepancia = 'falsa_alarma' | 'falta_confirmada' | 'herramienta_nueva' | 'investigacion';

export interface Inspeccion {
  id: string;
  areaId: string;
  areaNombre: string;
  cajaId: string;
  cajaNombre: string; // e.g. "Caja-005 de Luis Gómez"
  tecnicoResponsableId: string;
  tecnicoResponsableNombre: string;
  inspectorId: string;
  inspectorNombre: string;
  estado: EstadoInspeccion;
  fechaProgramada: string;
  fechaRealizacion?: string;
  fotoBaseUrl?: string; // reference photo from last inspection
  fotosNuevas: FotoInspeccion[];
  discrepancias: Discrepancia[];
  observacionesGenerales?: string;
  proximaInspeccion?: string; // auto 7 days after completion
  fechaCreacion: string;
}

export interface FotoInspeccion {
  url: string;
  angulo: 'frontal' | 'superior' | 'detalle';
  fechaCaptura: string;
  validada: boolean;
}

export interface Discrepancia {
  descripcion: string;
  tipo: 'herramienta_ausente' | 'herramienta_nueva' | 'herramienta_movida' | 'otro';
  resultado?: ResultadoDiscrepancia;
  herramientaAfectada?: string;
  ultimaVezConfirmada?: string;
  observacion?: string;
  reporteGenerado: boolean;
}
