/**
 * dashboardService.ts — Consume los 4 endpoints GET /api/dashboard/*
 */
import { httpClient } from './httpClient';

// ─── KPI 1–2, Flota Depreciada ────────────────────────────────────────────────

export interface TcoItem {
  activoId: string;
  nombre: string;
  valorOriginal: number;
  costoMantenimientos: number;
  costoFallas: number;
  tcoTotal: number;
}

export interface DisponibilidadArea {
  area: string;
  cantidadFallas: number;
  totalParadaMinutos: number;
  totalParadaHoras: number;
}

export interface ActivoDepreciado {
  activoId: string;
  nombre: string;
  porcentajeDepreciado: number;
  valorActual: number;
  valorOriginal: number;
  estado: string;
}

export interface DashboardActivosResponse {
  flota: {
    total: number;
    activos: number;
    enReparacion: number;
    dadosDeBaja: number;
    inactivos: number;
  };
  tco: {
    totalValorOriginalFlota: number;
    totalCostoMantenimientos: number;
    totalCostoFallas: number;
    tcoTotal: number;
    ranking: TcoItem[];
  };
  flotaDepreciada: {
    count: number;
    porcentajeDeFlota: number;
    activos: ActivoDepreciado[];
  };
  disponibilidadPorArea: DisponibilidadArea[];
}

// ─── KPI 3–5, Mantenimiento ──────────────────────────────────────────────────

export interface DashboardMantenimientoResponse {
  ratioTipo: {
    preventivo: { count: number; costoTotal: number };
    correctivo: { count: number; costoTotal: number };
    calibracion: { count: number; costoTotal: number };
  };
  porcentajeCorrectivo: number;
  costoPromedioPorTipo: { preventivo: number; correctivo: number; calibracion: number };
  semaforos: { verde: number; amarillo: number; naranja: number; rojo: number };
  cumplimientoPorcentaje: number;
  top5MasCostosos: {
    activoId: string;
    activoNombre: string;
    cantidadMantenimientos: number;
    costoTotal: number;
  }[];
}

// ─── KPI 6, Fallas ────────────────────────────────────────────────────────────

export interface FallaRankingItem {
  activoId: string;
  nombre: string;
  cantidadFallas: number;
  totalParadaHoras: number;
  totalCosto: number;
}

export interface MtbfItem {
  activoId: string;
  nombre: string;
  cantidadFallas: number;
  mtbfDias: number;
}

export interface DashboardFallasResponse {
  resumen: {
    total: number;
    porEstado: Record<string, number>;
    promedioParadaHoras: number;
    totalCostoFallas: number;
    promedioTiempoRespuestaGerenciaHoras: number;
  };
  ranking: FallaRankingItem[];
  mtbf: MtbfItem[];
  tiempoRespuestaGerencia: {
    promedioHoras: number;
    maxHoras: number;
    conteoSobreUmbral: number;
  };
}

// ─── KPI 7–8, Préstamos ───────────────────────────────────────────────────────

export interface DemandaHerramienta {
  herramientaId: string;
  nombre: string;
  cantidadPrestamos: number;
  totalHorasEstimadas: number;
  porcentajeTiempoPrestado: number;
}

export interface TecnicoConDano {
  tecnicoId: string;
  nombre: string;
  prestamosConDano: number;
  costoReparacionTotal: number;
  costoReposicionTotal: number;
  costoTotal: number;
}

export interface DashboardPrestamosResponse {
  resumen: {
    total: number;
    porEstado: Record<string, number>;
    totalDanosReportados: number;
    costoTotalDanos: number;
  };
  demandaHerramientas: DemandaHerramienta[];
  tecnicosConDano: TecnicoConDano[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const getDashboardActivos = () =>
  httpClient.get<DashboardActivosResponse>('/api/dashboard/activos');

export const getDashboardMantenimiento = () =>
  httpClient.get<DashboardMantenimientoResponse>('/api/dashboard/mantenimiento');

export const getDashboardFallas = () =>
  httpClient.get<DashboardFallasResponse>('/api/dashboard/fallas');

export const getDashboardPrestamos = () =>
  httpClient.get<DashboardPrestamosResponse>('/api/dashboard/prestamos');
