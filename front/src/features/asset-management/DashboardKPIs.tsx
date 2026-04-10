/**
 * DashboardKPIs.tsx — Tablero de 14 KPIs analíticos (D3.js v7)
 *
 * Calcula todos los KPIs en el cliente a partir de los servicios que
 * ya usa el resto de la aplicación — sin depender de endpoints nuevos.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { getAssets } from '@services/assetService';
import { getMantenimientos, getFallas, getCotizaciones } from '@services/maintenanceService';
import { getPrestamos, getInspecciones } from '@services/toolService';
import { getDepreciacionBulk } from '@services/financeService';
import { getConsumos } from '@services/consumablesService';
import type { Asset, FallaCorrectiva, MantenimientoPreventivo, SolicitudPrestamo, InspeccionFotografica, ConsumoInsumo, CotizacionRegistro } from '../../data/mockData';
import type { DepreciacionActivo } from '@services/financeService';

// ── Charts
import { renderChartTCO } from './charts/chart-tco';
import { renderChartDisponibilidad } from './charts/chart-disponibilidad';
import { renderChartMTBF } from './charts/chart-mtbf';
import { renderChartRatioMantenimiento } from './charts/chart-ratio-mantenimiento';
import { renderChartCumplimiento } from './charts/chart-cumplimiento';
import { renderChartBubble } from './charts/chart-bubble-fallas';
import { renderChartTecnicosDano } from './charts/chart-tecnicos-dano';
import { renderChartHeatmapDemanda } from './charts/chart-heatmap-demanda';
import { renderChartRadarDiscrepancias } from './charts/chart-radar-discrepancias';
import { renderChartVariacionPresupuestal } from './charts/chart-variacion-presupuestal';
import { renderChartBoxplotRespuesta } from './charts/chart-boxplot-respuesta';
import { renderChartTreemapBajas } from './charts/chart-treemap-bajas';
import { renderChartScatterInsumos } from './charts/chart-scatter-insumos';
import { renderChartDepreciacionFlota } from './charts/chart-depreciacion-flota';

/* ─── Loading skeleton ─────────────────────────────── */
function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="h-4 w-40 bg-slate-200 rounded animate-pulse mb-3" />
      <div className="h-3 w-64 bg-slate-100 rounded animate-pulse mb-6" />
      <div className="h-56 bg-slate-100 rounded animate-pulse" />
    </div>
  );
}

/* ─── Chart card wrapper ───────────────────────────── */
interface ChartCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  colSpan?: 1 | 2;
}
function ChartCard({ title, subtitle, children, colSpan = 1 }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${colSpan === 2 ? 'lg:col-span-2' : ''}`}
    >
      <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 mb-4">{subtitle}</p>
      <div className="relative">{children}</div>
    </motion.div>
  );
}

// ─── KPI helpers ─────────────────────────────────────────────────────────────

function safeDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs((b.getTime() - a.getTime()) / 86_400_000);
}

function buildAssetMap(assets: Asset[]): Map<string, Asset> {
  return new Map(assets.map(a => [a.id, a]));
}

// KPI 1 — TCO: valor original + costos de fallas agrupados por activo
function computeTCO(assets: Asset[], fallas: FallaCorrectiva[]) {
  const costosFalla = new Map<string, number>();
  for (const f of fallas) {
    costosFalla.set(f.assetId, (costosFalla.get(f.assetId) ?? 0) + (f.costoReparacion ?? 0));
  }
  return assets
    .map(a => ({
      activoId: a.id,
      nombre: a.descripcion,
      valorOriginal: a.valor ?? 0,
      costoMantenimientos: 0,
      costoFallas: costosFalla.get(a.id) ?? 0,
      tcoTotal: (a.valor ?? 0) + (costosFalla.get(a.id) ?? 0),
    }))
    .filter(r => r.tcoTotal > 0)
    .sort((a, b) => b.tcoTotal - a.tcoTotal)
    .slice(0, 10);
}

// KPI 2 — Horas de parada (tiempoParada) agrupadas por área del activo
function computeDisponibilidad(fallas: FallaCorrectiva[], assetMap: Map<string, Asset>) {
  const acc = new Map<string, { cantidadFallas: number; totalParadaHoras: number }>();
  for (const f of fallas) {
    const area = assetMap.get(f.assetId)?.area ?? 'Sin área';
    const prev = acc.get(area) ?? { cantidadFallas: 0, totalParadaHoras: 0 };
    acc.set(area, {
      cantidadFallas: prev.cantidadFallas + 1,
      totalParadaHoras: prev.totalParadaHoras + (f.tiempoParada ?? 0),
    });
  }
  return Array.from(acc.entries()).map(([area, v]) => ({
    area,
    cantidadFallas: v.cantidadFallas,
    totalParadaMinutos: v.totalParadaHoras * 60,
    totalParadaHoras: v.totalParadaHoras,
  }));
}

// KPI 3 — MTBF por activo (días): período / cantidad de fallas
function computeMTBF(fallas: FallaCorrectiva[], assetMap: Map<string, Asset>) {
  const grouped = new Map<string, { nombre: string; fechas: Date[] }>();
  for (const f of fallas) {
    const d = safeDate(f.fechaFalla);
    if (!d) continue;
    const asset = assetMap.get(f.assetId);
    if (!grouped.has(f.assetId)) {
      grouped.set(f.assetId, { nombre: asset?.descripcion ?? f.assetDescripcion, fechas: [] });
    }
    grouped.get(f.assetId)!.fechas.push(d);
  }
  const today = new Date();
  return Array.from(grouped.entries())
    .map(([activoId, { nombre, fechas }]) => {
      const sorted = fechas.sort((a, b) => a.getTime() - b.getTime());
      const period = daysBetween(sorted[0], today);
      const mtbfDias = sorted.length > 1 ? period / sorted.length : period;
      return { activoId, nombre, cantidadFallas: sorted.length, mtbfDias: Math.round(mtbfDias) };
    })
    .sort((a, b) => a.mtbfDias - b.mtbfDias)
    .slice(0, 12);
}

// KPI 4 — Ratio preventivo/correctivo/calibración por área
function computeRatio(mantenimientos: MantenimientoPreventivo[], fallas: FallaCorrectiva[], assetMap: Map<string, Asset>) {
  const acc = new Map<string, { prev: number; corr: number; calib: number }>();
  const ensure = (area: string) => {
    if (!acc.has(area)) acc.set(area, { prev: 0, corr: 0, calib: 0 });
    return acc.get(area)!;
  };
  for (const m of mantenimientos) {
    const area = assetMap.get(m.assetId)?.area ?? 'Sin área';
    const r = ensure(area);
    if (m.tipo?.toLowerCase().includes('calibr')) r.calib++;
    else r.prev++;
  }
  for (const f of fallas) {
    const area = assetMap.get(f.assetId)?.area ?? 'Sin área';
    ensure(area).corr++;
  }
  return Array.from(acc.entries()).map(([area, v]) => ({
    area,
    preventivo: { count: v.prev, costoTotal: 0 },
    correctivo: { count: v.corr, costoTotal: 0 },
    calibracion: { count: v.calib, costoTotal: 0 },
  }));
}

// KPI 5 — Cumplimiento: semáforo de mantenimientos programados
function computeCumplimiento(mantenimientos: MantenimientoPreventivo[]) {
  const sem = { verde: 0, amarillo: 0, naranja: 0, rojo: 0 };
  for (const m of mantenimientos) {
    if (m.estado === 'verde') sem.verde++;
    else if (m.estado === 'amarillo') sem.amarillo++;
    else sem.rojo++;
  }
  const total = mantenimientos.length;
  return {
    semaforos: sem,
    cumplimientoPorcentaje: total > 0 ? Math.round((sem.verde / total) * 100) : 0,
    vencidas: mantenimientos
      .filter(m => m.estado === 'rojo')
      .slice(0, 10)
      .map(m => ({ activoId: m.assetId, activoNombre: m.assetDescripcion })),
  };
}

// KPI 6 — Activos más problemáticos (bubble)
function computeBubble(fallas: FallaCorrectiva[], assetMap: Map<string, Asset>) {
  const acc = new Map<string, { nombre: string; tipo: string; cantidadFallas: number; totalCosto: number; totalParadaHoras: number }>();
  for (const f of fallas) {
    const asset = assetMap.get(f.assetId);
    if (!acc.has(f.assetId)) {
      acc.set(f.assetId, { nombre: asset?.descripcion ?? f.assetDescripcion, tipo: asset?.tipo ?? '—', cantidadFallas: 0, totalCosto: 0, totalParadaHoras: 0 });
    }
    const r = acc.get(f.assetId)!;
    r.cantidadFallas++;
    r.totalCosto += f.costoReparacion ?? 0;
    r.totalParadaHoras += f.tiempoParada ?? 0;
  }
  return Array.from(acc.entries())
    .map(([activoId, v]) => ({ activoId, ...v }))
    .sort((a, b) => b.cantidadFallas - a.cantidadFallas)
    .slice(0, 12);
}

// KPI 7 — Técnicos con préstamos con daño
function computeTecnicosConDano(prestamos: SolicitudPrestamo[]) {
  const acc = new Map<string, number>();
  for (const p of prestamos) {
    if (p.estadoDevolucion === 'Dañada' || p.estadoDevolucion === 'Incompleta') {
      acc.set(p.solicitante, (acc.get(p.solicitante) ?? 0) + 1);
    }
  }
  return Array.from(acc.entries())
    .map(([nombre, count]) => ({
      tecnicoId: nombre,
      nombre,
      prestamosConDano: count,
      costoReparacionTotal: 0,
      costoReposicionTotal: 0,
      costoTotal: 0,
    }))
    .sort((a, b) => b.prestamosConDano - a.prestamosConDano);
}

// KPI 8 — Demanda de herramientas: préstamos agrupados por activo
function computeHeatmap(prestamos: SolicitudPrestamo[], assetMap: Map<string, Asset>) {
  const BASELINE_HRS = 720;
  const acc = new Map<string, { nombre: string; count: number; totalHrs: number }>();
  for (const p of prestamos) {
    const nombre = assetMap.get(p.assetId)?.descripcion ?? p.assetDescripcion;
    const start = safeDate(p.fechaSolicitud);
    const end = safeDate(p.fechaDevolucionEstimada);
    const hrs = start && end ? daysBetween(start, end) * 8 : 8;
    if (!acc.has(p.assetId)) acc.set(p.assetId, { nombre, count: 0, totalHrs: 0 });
    const r = acc.get(p.assetId)!;
    r.count++;
    r.totalHrs += hrs;
  }
  return Array.from(acc.entries())
    .map(([herramientaId, v]) => ({
      herramientaId,
      nombre: v.nombre,
      cantidadPrestamos: v.count,
      totalHorasEstimadas: Math.round(v.totalHrs),
      porcentajeTiempoPrestado: Math.min(100, Math.round((v.totalHrs / BASELINE_HRS) * 100)),
    }))
    .sort((a, b) => b.porcentajeTiempoPrestado - a.porcentajeTiempoPrestado);
}

// KPI 9 — Radar: tasa de discrepancias por área (inspecciones actual vs anterior)
function computeRadar(inspecciones: InspeccionFotografica[]) {
  const now = new Date();
  const t3 = new Date(now); t3.setMonth(t3.getMonth() - 3);
  const t6 = new Date(now); t6.setMonth(t6.getMonth() - 6);
  const current = inspecciones.filter(i => { const d = safeDate(i.fechaInspeccion); return d && d >= t3; });
  const anterior = inspecciones.filter(i => { const d = safeDate(i.fechaInspeccion); return d && d >= t6 && d < t3; });
  const calcDisc = (arr: InspeccionFotografica[]) => {
    const gr = new Map<string, { total: number; disc: number }>();
    for (const i of arr) {
      const area = i.ubicacion ?? 'Sin área';
      if (!gr.has(area)) gr.set(area, { total: 0, disc: 0 });
      const r = gr.get(area)!;
      r.total++;
      if (i.tieneDiscrepancias) r.disc++;
    }
    return gr;
  };
  const gCurrent = calcDisc(current);
  const gAnterior = calcDisc(anterior);
  const areas = Array.from(new Set([...gCurrent.keys(), ...gAnterior.keys()]));
  if (areas.length < 3) return null;
  const currentVals: Record<string, number> = {};
  const anteriorVals: Record<string, number> = {};
  for (const area of areas) {
    const c = gCurrent.get(area);
    currentVals[area] = c && c.total > 0 ? Math.round((c.disc / c.total) * 100) : 0;
    const a = gAnterior.get(area);
    anteriorVals[area] = a && a.total > 0 ? Math.round((a.disc / a.total) * 100) : 0;
  }
  return {
    areas,
    datasets: [
      { label: 'Período actual', color: '#E94560', values: currentVals },
      { label: 'Período anterior', color: '#3B82F6', values: anteriorVals },
    ],
  };
}

// KPI 10 — Variación presupuestal mensual (cotizaciones)
function computePresupuestal(cotizaciones: CotizacionRegistro[]) {
  const acc = new Map<string, { estimado: number; ejecutado: number }>();
  for (const c of cotizaciones) {
    const mes = c.fechaRegistro?.slice(0, 7);
    if (!mes) continue;
    if (!acc.has(mes)) acc.set(mes, { estimado: 0, ejecutado: 0 });
    const r = acc.get(mes)!;
    const primera = c.proformas[0]?.valorTotal ?? 0;
    const seleccionada = c.proformas.find(p => p.seleccionada)?.valorTotal ?? primera;
    r.estimado += primera;
    r.ejecutado += c.estado === 'Aprobada' ? seleccionada : primera;
  }
  const result = Array.from(acc.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, montoEstimado: v.estimado, costoFinalEjecutado: v.ejecutado }));
  return result.length >= 2 ? result : null;
}

// KPI 11 — Box plot: tiempo de espera gerencial por tipoCausa de falla
function computeBoxplot(fallas: FallaCorrectiva[]) {
  const acc = new Map<string, number[]>();
  for (const f of fallas) {
    const dias = f.horasEsperaAutorizacion != null
      ? f.horasEsperaAutorizacion / 24
      : (() => {
          const a = safeDate(f.fechaAutorizacion);
          const s = safeDate(f.fechaSolicitudAutorizacion);
          return a && s ? daysBetween(s, a) : null;
        })();
    if (dias == null || dias < 0) continue;
    if (!acc.has(f.tipoCausa)) acc.set(f.tipoCausa, []);
    acc.get(f.tipoCausa)!.push(parseFloat(dias.toFixed(2)));
  }
  const result = Array.from(acc.entries())
    .filter(([, v]) => v.length >= 2)
    .map(([tipo, valores]) => ({ tipo, valores }));
  return result.length ? result : null;
}

// KPI 12 — Treemap: activos dados de baja
function computeTreemap(assets: Asset[], depreciacion: DepreciacionActivo[]) {
  const depMap = new Map(depreciacion.map(d => [d.activoId, d]));
  const today = new Date();
  return assets
    .filter(a => a.estado === 'Dado de Baja')
    .map(a => {
      const dep = depMap.get(a.id);
      const valorOriginal = dep?.valorOriginal ?? a.valor ?? 0;
      const fechaCompra = safeDate(a.fechaCompra);
      const vidaUtilMs = (a.vidaUtil ?? 5) * 365 * 86_400_000;
      const fechaEstimadaBaja = fechaCompra ? new Date(fechaCompra.getTime() + vidaUtilMs) : null;
      const diasDesdeBaja = fechaEstimadaBaja ? Math.max(0, Math.round(daysBetween(fechaEstimadaBaja, today))) : 0;
      return { activoId: a.id, nombre: a.descripcion, valorOriginal, fechaBaja: fechaEstimadaBaja?.toISOString().slice(0, 10) ?? '—', diasDesdeBaja };
    })
    .filter(r => r.valorOriginal > 0);
}

// KPI 13 — Scatter: consumo anómalo de insumos por técnico
function computeScatter(consumos: ConsumoInsumo[]) {
  // Average per insumo across all technicians = consumoEsperado
  const insumoAcc = new Map<string, { total: number; count: number }>();
  for (const c of consumos) {
    const k = c.insumo;
    if (!insumoAcc.has(k)) insumoAcc.set(k, { total: 0, count: 0 });
    insumoAcc.get(k)!.total += c.cantidad;
    insumoAcc.get(k)!.count++;
  }
  // Per (insumo, tecnico) sums
  const tecAcc = new Map<string, { cantidad: number }>();
  for (const c of consumos) {
    const k = `${c.insumo}||${c.tecnico}`;
    if (!tecAcc.has(k)) tecAcc.set(k, { cantidad: 0 });
    tecAcc.get(k)!.cantidad += c.cantidad;
  }
  const result = Array.from(tecAcc.entries()).map(([k, v]) => {
    const [insumo, tecnico] = k.split('||');
    const avg = insumoAcc.get(insumo);
    const consumoEsperado = avg ? avg.total / avg.count : 0;
    const desviacion = consumoEsperado > 0 ? (v.cantidad - consumoEsperado) / consumoEsperado : 0;
    return {
      insumoId: insumo,
      nombre: insumo,
      tecnicoId: tecnico,
      tecnicoNombre: tecnico,
      consumoEsperado: parseFloat(consumoEsperado.toFixed(2)),
      consumoReal: v.cantidad,
      desviacion: parseFloat(desviacion.toFixed(3)),
    };
  });
  return result.length >= 3 ? result : null;
}

// KPI 14 — Depreciación crítica de flota
function computeDepreciacion(depreciacion: DepreciacionActivo[], assetMap: Map<string, Asset>) {
  const estadoMap: Record<string, 'activo' | 'inactivo' | 'en-reparacion' | 'dado-de-baja'> = {
    'Activo': 'activo',
    'En Reparación': 'en-reparacion',
    'Dado de Baja': 'dado-de-baja',
  };
  return depreciacion
    .map(d => ({
      activoId: d.activoId,
      nombre: d.nombre,
      porcentajeDepreciado: d.porcentajeDepreciado,
      estado: estadoMap[assetMap.get(d.activoId)?.estado ?? ''] ?? 'activo',
      valorOriginal: d.valorOriginal,
      valorActual: d.valorActual,
    }))
    .sort((a, b) => b.porcentajeDepreciado - a.porcentajeDepreciado);
}

/* ─── Main component ───────────────────────────────── */
export function DashboardKPIs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw data state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [mantenimientos, setMantenimientos] = useState<MantenimientoPreventivo[]>([]);
  const [fallas, setFallas] = useState<FallaCorrectiva[]>([]);
  const [prestamos, setPrestamos] = useState<SolicitudPrestamo[]>([]);
  const [inspecciones, setInspecciones] = useState<InspeccionFotografica[]>([]);
  const [cotizaciones, setCotizaciones] = useState<CotizacionRegistro[]>([]);
  const [consumos, setConsumos] = useState<ConsumoInsumo[]>([]);
  const [depreciacion, setDepreciacion] = useState<DepreciacionActivo[]>([]);

  // Refs — one per chart
  const refTco = useRef<HTMLDivElement>(null);
  const refDisponibilidad = useRef<HTMLDivElement>(null);
  const refMtbf = useRef<HTMLDivElement>(null);
  const refRatio = useRef<HTMLDivElement>(null);
  const refCumplimiento = useRef<HTMLDivElement>(null);
  const refBubble = useRef<HTMLDivElement>(null);
  const refTecnicos = useRef<HTMLDivElement>(null);
  const refHeatmap = useRef<HTMLDivElement>(null);
  const refRadar = useRef<HTMLDivElement>(null);
  const refPresupuestal = useRef<HTMLDivElement>(null);
  const refBoxplot = useRef<HTMLDivElement>(null);
  const refTreemap = useRef<HTMLDivElement>(null);
  const refScatter = useRef<HTMLDivElement>(null);
  const refDepreciacion = useRef<HTMLDivElement>(null);

  /* ── Fetch all data in parallel using existing services ── */
  useEffect(() => {
    Promise.allSettled([
      getAssets(),
      getMantenimientos(),
      getFallas(),
      getPrestamos(),
      getInspecciones(),
      getCotizaciones(),
      getConsumos(),
      getDepreciacionBulk(),
    ]).then(([rAssets, rMant, rFallas, rPrestamos, rInsp, rCot, rConsumos, rDep]) => {
      if (rAssets.status === 'fulfilled') setAssets(rAssets.value);
      if (rMant.status === 'fulfilled') setMantenimientos(rMant.value);
      if (rFallas.status === 'fulfilled') setFallas(rFallas.value);
      if (rPrestamos.status === 'fulfilled') setPrestamos(rPrestamos.value);
      if (rInsp.status === 'fulfilled') setInspecciones(rInsp.value);
      if (rCot.status === 'fulfilled') setCotizaciones(rCot.value);
      if (rConsumos.status === 'fulfilled') setConsumos(rConsumos.value);
      if (rDep.status === 'fulfilled') setDepreciacion(rDep.value.activos ?? []);

      const anyLoaded = [rAssets, rMant, rFallas].some(r => r.status === 'fulfilled');
      if (!anyLoaded) setError('No se pudo cargar ningún dato del inventario');
    }).finally(() => setLoading(false));
  }, []);

  /* ── Mount/re-mount D3 charts when data changes ── */
  useEffect(() => {
    if (loading) return;
    const assetMap = buildAssetMap(assets);

    if (refTco.current)
      renderChartTCO(refTco.current, computeTCO(assets, fallas));

    if (refDisponibilidad.current)
      renderChartDisponibilidad(refDisponibilidad.current, computeDisponibilidad(fallas, assetMap));

    if (refMtbf.current)
      renderChartMTBF(refMtbf.current, computeMTBF(fallas, assetMap));

    if (refRatio.current)
      renderChartRatioMantenimiento(refRatio.current, computeRatio(mantenimientos, fallas, assetMap));

    if (refCumplimiento.current)
      renderChartCumplimiento(refCumplimiento.current, computeCumplimiento(mantenimientos));

    if (refBubble.current)
      renderChartBubble(refBubble.current, computeBubble(fallas, assetMap));

    if (refTecnicos.current)
      renderChartTecnicosDano(refTecnicos.current, computeTecnicosConDano(prestamos));

    if (refHeatmap.current)
      renderChartHeatmapDemanda(refHeatmap.current, computeHeatmap(prestamos, assetMap));

    if (refRadar.current)
      renderChartRadarDiscrepancias(refRadar.current, computeRadar(inspecciones));

    if (refPresupuestal.current)
      renderChartVariacionPresupuestal(refPresupuestal.current, computePresupuestal(cotizaciones));

    if (refBoxplot.current)
      renderChartBoxplotRespuesta(refBoxplot.current, computeBoxplot(fallas));

    if (refTreemap.current) {
      const bajas = computeTreemap(assets, depreciacion);
      renderChartTreemapBajas(refTreemap.current, bajas.length ? bajas : null);
    }

    if (refScatter.current)
      renderChartScatterInsumos(refScatter.current, computeScatter(consumos));

    if (refDepreciacion.current) {
      const items = depreciacion.length
        ? computeDepreciacion(depreciacion, assetMap)
        : assets.map(a => ({
            activoId: a.id,
            nombre: a.descripcion,
            porcentajeDepreciado: a.vidaUtil > 0 ? Math.min(100, Math.round(
              (daysBetween(safeDate(a.fechaCompra) ?? new Date(), new Date()) / (a.vidaUtil * 365)) * 100
            )) : 0,
            estado: (a.estado === 'Dado de Baja' ? 'dado-de-baja' : a.estado === 'En Reparación' ? 'en-reparacion' : 'activo') as 'activo' | 'inactivo' | 'en-reparacion' | 'dado-de-baja',
            valorOriginal: a.valor ?? 0,
            valorActual: a.valor ?? 0,
          })).filter(i => i.valorOriginal > 0).sort((a, b) => b.porcentajeDepreciado - a.porcentajeDepreciado);
      renderChartDepreciacionFlota(refDepreciacion.current, items.length ? items : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, assets, mantenimientos, fallas, prestamos, inspecciones, cotizaciones, consumos, depreciacion]);

  /* ── Summary KPI numbers (computed from raw data) ── */
  const summaryCards = [
    { label: 'Total activos', value: assets.length, color: 'text-blue-600' },
    { label: 'Operativos', value: assets.filter(a => a.estado === 'Activo').length, color: 'text-emerald-600' },
    { label: 'En reparación', value: assets.filter(a => a.estado === 'En Reparación').length, color: 'text-amber-600' },
    { label: 'Fallas registradas', value: fallas.length, color: 'text-rose-600' },
  ];

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-rose-600 font-medium mb-2">Error al cargar KPIs</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard de KPIs Analíticos</h1>
        <p className="text-slate-500 mt-1">
          14 indicadores calculados directamente desde el inventario, mantenimientos, fallas y préstamos
        </p>
      </div>

      {/* Summary numbers */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
              <div className="h-8 w-12 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {summaryCards.map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs text-slate-500 mb-1">{c.label}</p>
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 14 }).map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <ChartCard title="KPI 1 — Costo Total de Propiedad (TCO)" subtitle="Valor de compra + costos acumulados de fallas, por activo (top 10)">
            <div ref={refTco} className="w-full min-h-56" />
          </ChartCard>

          <ChartCard title="KPI 2 — Horas de parada no planificada por área" subtitle="Suma de tiempoParada de fallas correctivas, agrupado por área del activo">
            <div ref={refDisponibilidad} className="w-full min-h-56" />
          </ChartCard>

          <ChartCard title="KPI 3 — MTBF por activo" subtitle="Días promedio entre fallas — más bajo = más crítico (top 12 peores)">
            <div ref={refMtbf} className="w-full min-h-56" />
          </ChartCard>

          <ChartCard title="KPI 4 — Ratio preventivo vs correctivo por área" subtitle="Mantenimientos programados (preventivo) vs fallas correctivas registradas">
            <div ref={refRatio} className="w-full min-h-56" />
          </ChartCard>

          <ChartCard title="KPI 5 — Cumplimiento del plan de mantenimiento" subtitle="Semáforo de estados de programaciones — verde = al día, rojo = vencido">
            <div ref={refCumplimiento} className="w-full min-h-56" />
          </ChartCard>

          <ChartCard title="KPI 6 — Activos más problemáticos" subtitle="Burbuja: X=cantidad fallas, Y=costo total, tamaño=horas de parada">
            <div ref={refBubble} className="w-full min-h-56" />
          </ChartCard>

          <ChartCard title="KPI 7 — Técnicos con préstamos dañados" subtitle="Técnicos con mayor número de devoluciones en estado Dañada o Incompleta">
            <div ref={refTecnicos} className="w-full min-h-56" />
          </ChartCard>

          <ChartCard title="KPI 8 — Demanda de herramientas" subtitle="% tiempo prestado (horas estimadas / 720h base mensual) por herramienta">
            <div ref={refHeatmap} className="w-full min-h-56" />
          </ChartCard>

          <ChartCard title="KPI 9 — Tasa de discrepancias en inspecciones por área" subtitle="Radar: % inspecciones con discrepancias — período actual vs 3 meses atrás">
            <div ref={refRadar} className="w-full min-h-56" />
          </ChartCard>

          <ChartCard title="KPI 10 — Variación presupuestal mensual" subtitle="Primera proforma (estimado) vs proforma aprobada (ejecutado) por mes">
            <div ref={refPresupuestal} className="w-full min-h-56" />
          </ChartCard>

          <ChartCard title="KPI 11 — Tiempo de espera de autorización gerencial" subtitle="Box plot de días de espera por tipo de causa de falla — SLA: 5 días">
            <div ref={refBoxplot} className="w-full min-h-56" />
          </ChartCard>

          <ChartCard title="KPI 12 — Capital inmovilizado en activos dados de baja" subtitle="Treemap: tamaño = valor original, color = días desde fecha estimada de baja">
            <div ref={refTreemap} className="w-full min-h-56" />
          </ChartCard>

          <ChartCard title="KPI 13 — Consumo anómalo de insumos por técnico" subtitle="Scatter: consumo esperado (promedio del insumo) vs real por técnico — zona roja >30%">
            <div ref={refScatter} className="w-full min-h-56" />
          </ChartCard>

          <ChartCard title="KPI 14 — Flota con depreciación crítica" subtitle="Porcentaje depreciado por activo — ⚠ = activo aún operativo con >80% depreciado">
            <div ref={refDepreciacion} className="w-full min-h-56" />
          </ChartCard>

        </div>
      )}
    </div>
  );
}
