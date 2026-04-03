// ─── Catálogo de Equipos de Protección Personal ─────────────────────────────────
export interface CatalogoEPP {
  id: string;
  nombre: string;
  tipo: string; // guantes-nitrilo, mascarilla-n95, gafas-seguridad, botas-seguridad, etc.
  frecuenciaReposicionDias: number; // e.g. 30, 90, 180, 365
  costoUnitario: number;
  stockActual?: number;
}

// ─── Registro de entrega de EPP a técnico ───────────────────────────────────────
export interface EntregaEPP {
  id: string;
  eppId: string;
  eppNombre: string;
  eppTipo: string;
  tecnicoId: string;
  tecnicoNombre: string;
  areaId: string;
  cantidad: number;
  loteProveedor?: string;
  fechaEntrega: string;
  proximaReposicion: string; // calculated from frecuenciaReposicionDias
  esExtraordinaria: boolean;
  motivoExtraordinaria?: string;
  firmaDigitalTecnico: boolean;
  entregadoPor: string;
  entregadoPorNombre: string;
}

// ─── Comparativa de consumo EPP por técnico ─────────────────────────────────────
export interface ComparativaEPP {
  tecnicoId: string;
  tecnicoNombre: string;
  areaId: string;
  consumoReal: number;       // entregas in period
  consumoEsperado: number;   // based on frecuencia and working days
  indice: number;            // consumoReal / consumoEsperado
  costoAdicional: number;    // (consumoReal - consumoEsperado) * costoUnitario
  alerta: boolean;           // indice > 1.3
}
