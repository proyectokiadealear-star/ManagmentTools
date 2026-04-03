// ─── Catálogo de insumos (pintura, barniz, lija, etc.) ─────────────────────────
export interface CatalogoInsumo {
  id: string;
  nombre: string;
  tipo: string; // pintura, barniz, lija, masking, aceite, filtros, etc.
  codigo: string;
  unidadMedida: string; // litros, unidades, rollos, metros, galones
  costoUnitario: number;
  consumoPromedioPorOT: number; // historical average
  stockActual?: number;
  stockMinimo?: number;
}

// ─── Registro de consumo de insumo por OT ──────────────────────────────────────
export interface ConsumoInsumo {
  id: string;
  ordenTrabajoId: string;
  insumoId: string;
  insumoNombre: string;
  insumoCodigo: string;
  cantidad: number;
  unidadMedida: string;
  costoUnitario: number;
  costoTotal: number;
  cantidadEsperada: number; // from consumoPromedioPorOT
  desviacion: number; // (cantidad - cantidadEsperada) / cantidadEsperada
  justificacion?: string; // required if exceeds tolerance
  evidenciaUrl?: string;
  aprobadoPor?: string;
  tecnicoId: string;
  tecnicoNombre: string;
  areaId: string;
  fechaRegistro: string;
}

// ─── Niveles de anomalía ────────────────────────────────────────────────────────
export type NivelAnomalia = 'normal' | 'alerta' | 'critico';

// ─── Análisis de anomalía por insumo ────────────────────────────────────────────
export interface AnalisisAnomalia {
  insumoId: string;
  insumoNombre: string;
  periodo: string;
  consumoReal: number;
  consumoEsperado: number;
  desviacionPorcentaje: number;
  nivel: NivelAnomalia;
  otsSospechosas: { otId: string; cantidad: number; tecnico: string }[];
  clasificacion?: 'tecnica_ineficiente' | 'defecto_proveedor' | 'sustraccion' | 'justificado';
}
