import { useState, useEffect, useMemo } from 'react';
import { FlaskConical, AlertTriangle, PlusCircle, X, Loader2, TrendingUp, Package, DollarSign, ShieldAlert } from 'lucide-react';
import { useRole } from '@shared/context/AssetContext';
import { computeStats } from '@shared/utils/stats';
import { Pagination } from '@shared/components';
import { usePagination } from '@shared/hooks/usePagination';
import { getConsumos, createConsumo, getCatalogoInsumos } from '../../services/consumablesService';
import type { ConsumoInsumo, CatalogoInsumo, RegistrarConsumoPayload } from '../../services/consumablesService';
import { getUsuariosAsignables } from '../../services/usuariosService';
import type { Usuario } from '../../services/usuariosService';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type Periodo = 'semanal' | 'mensual' | 'trimestral';

function getChartData(consumos: ConsumoInsumo[], periodo: Periodo) {
  const groups: Record<string, number> = {};
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  consumos.forEach(c => {
    const d = new Date(c.fecha);
    let key: string;
    if (periodo === 'semanal') {
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      key = `${d.getFullYear()}-S${String(weekNum).padStart(2, '0')}`;
    } else if (periodo === 'mensual') {
      key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    } else {
      const q = Math.ceil((d.getMonth() + 1) / 3);
      key = `Q${q} ${d.getFullYear()}`;
    }
    groups[key] = (groups[key] ?? 0) + c.costoTotal;
  });

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([label, total]) => ({ label, total }));
}

function getCostByCategory(consumos: ConsumoInsumo[], catalogo: CatalogoInsumo[]) {
  const catMap = Object.fromEntries(catalogo.map(i => [i.id, i.tipo]));
  const groups: Record<string, number> = {};
  consumos.forEach(c => {
    const tipo = catMap[c.categoria] ?? c.categoria ?? 'otros';
    groups[tipo] = (groups[tipo] ?? 0) + c.costoTotal;
  });
  return Object.entries(groups)
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

function getCostByTecnico(consumos: ConsumoInsumo[]) {
  const groups: Record<string, number> = {};
  consumos.forEach(c => {
    groups[c.tecnico] = (groups[c.tecnico] ?? 0) + c.costoTotal;
  });
  return Object.entries(groups)
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

interface HBarProps { data: { label: string; total: number }[]; color?: string }

function HorizontalBar({ data, color = 'bg-amber-500' }: HBarProps) {
  const max = Math.max(...data.map(d => d.total), 1);
  if (data.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>;
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-32 text-xs text-gray-600 truncate shrink-0 text-right">{d.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full ${color} rounded-full flex items-center justify-end pr-2 transition-all`}
              style={{ width: `${(d.total / max) * 100}%` }}
            >
              <span className="text-[10px] font-bold text-white whitespace-nowrap">${fmt(d.total)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function VerticalBar({ data }: { data: { label: string; total: number }[] }) {
  const max = Math.max(...data.map(d => d.total), 1);
  if (data.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Sin datos para el período</p>;
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map(d => (
        <div key={d.label} className="flex flex-col items-center flex-1 min-w-0 h-full justify-end gap-1">
          <div
            className="w-full bg-amber-400 rounded-t transition-all"
            style={{ height: `${Math.max((d.total / max) * 100, 4)}%` }}
          />
          <span className="text-[9px] text-gray-500 truncate w-full text-center leading-tight">{d.label}</span>
          <span className="text-[9px] font-semibold text-amber-700 truncate w-full text-center">${fmt(d.total)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Anomaly badge ─────────────────────────────────────────────────────────────

function desviacionBadge(desviacion: number) {
  const abs = Math.abs(desviacion);
  if (abs > 1) return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">+{Math.round(abs * 100)}%</span>;
  if (abs > 0.2) return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">+{Math.round(abs * 100)}%</span>;
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MaterialConsumption() {
  const role = useRole();
  const [consumos, setConsumos] = useState<ConsumoInsumo[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoInsumo[]>([]);
  const [usuariosAsignables, setUsuariosAsignables] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [periodoVista, setPeriodoVista] = useState<Periodo>('mensual');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.allSettled([
      getConsumos(),
      getCatalogoInsumos(),
      getUsuariosAsignables(),
    ]).then(([rC, rCat, rU]) => {
      if (cancelled) return;
      if (rC.status === 'fulfilled') setConsumos(rC.value);
      else setLoadError('No se pudieron cargar los consumos. Verifique la conexión.');
      if (rCat.status === 'fulfilled') setCatalogo(rCat.value);
      if (rU.status === 'fulfilled') setUsuariosAsignables(rU.value);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Form state (Master-Detail) ───────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [formMaster, setFormMaster] = useState({ 
    ordenTrabajo: '', 
    tecnicoId: '', 
    tecnicoSearchQuery: '', 
    tecnicoDropdownOpen: false 
  });
  
  interface ConsumoRow {
    id: string;
    insumoId: string;
    unidadLocal: string;
    cantidad: string;
    justificacion: string;
    searchQuery: string;
    dropdownOpen: boolean;
  }
  
  const createEmptyRow = (): ConsumoRow => ({
    id: crypto.randomUUID(),
    insumoId: '',
    unidadLocal: '',
    cantidad: '',
    justificacion: '',
    searchQuery: '',
    dropdownOpen: false
  });

  const [formRows, setFormRows] = useState<ConsumoRow[]>([createEmptyRow()]);
  const [formMasterErrors, setFormMasterErrors] = useState<Record<string, string>>({});
  const [formRowsErrors, setFormRowsErrors] = useState<Record<string, Record<string, string>>>({});
  
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Derived analytics ─────────────────────────────────────────────────────

  const sortedConsumos = useMemo(
    () => [...consumos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [consumos],
  );

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return sortedConsumos;
    const q = searchQuery.toLowerCase();
    return sortedConsumos.filter(c =>
      c.ordenTrabajo?.toLowerCase().includes(q) ||
      c.tecnico?.toLowerCase().includes(q) ||
      c.insumo?.toLowerCase().includes(q),
    );
  }, [sortedConsumos, searchQuery]);

  const { paginatedItems, currentPage, pageSize, setCurrentPage, setPageSize, totalItems } =
    usePagination(filteredBySearch, 10);

  const totalCosto = useMemo(() => consumos.reduce((s, c) => s + c.costoTotal, 0), [consumos]);
  const totalOTs = useMemo(() => new Set(consumos.map(c => c.ordenTrabajo)).size, [consumos]);
  const ratioEficiencia = totalOTs > 0 ? totalCosto / totalOTs : 0;

  const chartData = useMemo(() => getChartData(consumos, periodoVista), [consumos, periodoVista]);
  const categoryData = useMemo(() => getCostByCategory(consumos, catalogo), [consumos, catalogo]);
  const tecnicoData = useMemo(() => getCostByTecnico(consumos), [consumos]);

  // Client-side anomaly detection (per material and per technician)
  const { materialAnomalies, technicianAnomalies } = useMemo(() => {
    if (role !== 'jefe') return { materialAnomalies: [], technicianAnomalies: [] };

    const byInsumo: Record<string, ConsumoInsumo[]> = {};
    consumos.forEach(c => {
      if (!byInsumo[c.insumo]) byInsumo[c.insumo] = [];
      byInsumo[c.insumo].push(c);
    });

    const mat: { record: ConsumoInsumo; mean: number; severity: 'Alta' | 'Media' }[] = [];
    Object.values(byInsumo).forEach(group => {
      const { mean, stdDev } = computeStats(group.map(c => c.costoTotal));
      group.forEach(record => {
        if (record.costoTotal > mean + stdDev) {
          mat.push({ record, mean, severity: record.costoTotal > mean + 2 * stdDev ? 'Alta' : 'Media' });
        }
      });
    });

    const byTecnico: Record<string, number> = {};
    consumos.forEach(c => { byTecnico[c.tecnico] = (byTecnico[c.tecnico] ?? 0) + c.costoTotal; });
    const { mean: peerMean } = computeStats(Object.values(byTecnico));
    const tech: { tecnico: string; total: number; pct: number }[] = [];
    Object.entries(byTecnico).forEach(([tecnico, total]) => {
      if (total > peerMean * 1.25) {
        tech.push({ tecnico, total, pct: Math.round(((total - peerMean) / peerMean) * 100) });
      }
    });

    return { materialAnomalies: mat, technicianAnomalies: tech };
  }, [consumos, role]);

  const anomalyCount = materialAnomalies.length + technicianAnomalies.length;

  // ── Handlers ──────────────────────────────────────────────────────────────
  
  function getCantidadConvertida(cantidadLocal: number, unidadLocal: string, insumoBase?: string) {
    const isBaseLiquid = ['litros', 'litro', 'galones', 'galon', 'tazas', 'taza', 'tapas', 'tapa'].includes(insumoBase?.toLowerCase() || '');
    if (!isBaseLiquid) return cantidadLocal;

    // 1. Convert to Litros based on selected unit
    let inLitros = cantidadLocal;
    if (unidadLocal === 'galones') inLitros = cantidadLocal * 3.785;
    if (unidadLocal === 'tazas' || unidadLocal === 'tapas') inLitros = cantidadLocal * 0.2366;
    
    // 2. Convert Litros to the base unit of the Insumo
    const base = insumoBase?.toLowerCase() || '';
    if (base === 'galones' || base === 'galon') return inLitros / 3.785;
    if (base === 'tazas' || base === 'taza' || base === 'tapas' || base === 'tapa') return inLitros / 0.2366;
    
    return inLitros; // default is litros
  }

  function resetForm() {
    setFormMaster({ ordenTrabajo: '', tecnicoId: '', tecnicoSearchQuery: '', tecnicoDropdownOpen: false });
    setFormRows([createEmptyRow()]);
    setFormMasterErrors({});
    setFormRowsErrors({});
    setSaveError('');
  }

  function addRow() {
    setFormRows(prev => [...prev, createEmptyRow()]);
  }

  function removeRow(id: string) {
    if (formRows.length === 1) {
      setFormRows([createEmptyRow()]);
      setFormRowsErrors({});
    } else {
      setFormRows(prev => prev.filter(r => r.id !== id));
      setFormRowsErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[id];
        return newErrs;
      });
    }
  }

  function updateRow(id: string, updates: Partial<ConsumoRow>) {
    setFormRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  function validateForm() {
    let isValid = true;
    const mErrors: Record<string, string> = {};
    if (!formMaster.ordenTrabajo.trim()) { mErrors.ordenTrabajo = 'Requerido'; isValid = false; }
    if (!formMaster.tecnicoId) { mErrors.tecnicoId = 'Requerido'; isValid = false; }
    setFormMasterErrors(mErrors);

    const rErrors: Record<string, Record<string, string>> = {};
    formRows.forEach(row => {
      const errs: Record<string, string> = {};
      const insumo = catalogo.find(i => i.id === row.insumoId);
      
      if (!row.insumoId) errs.insumoId = 'Seleccione insumo';
      const qty = Number(row.cantidad);
      if (!row.cantidad || qty <= 0) errs.cantidad = 'Mínimo 0.01';
      
      if (insumo) {
        const qtyConvertida = getCantidadConvertida(qty, row.unidadLocal, insumo.unidadMedida);
        const desviacion = insumo.consumoPromedioPorOT > 0 
          ? Math.abs((qtyConvertida - insumo.consumoPromedioPorOT) / insumo.consumoPromedioPorOT) 
          : 0;
        if (desviacion > 0.2 && !row.justificacion.trim()) {
          errs.justificacion = 'Requiere justificación (>20% desv.)';
        }
      }
      
      if (Object.keys(errs).length > 0) {
        rErrors[row.id] = errs;
        isValid = false;
      }
    });
    setFormRowsErrors(rErrors);
    
    return isValid;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaveError('');
    setSaving(true);
    
    const tecnico = usuariosAsignables.find(u => u.id === formMaster.tecnicoId);
    if (!tecnico) {
      setSaving(false);
      return;
    }

    try {
      const payloads: RegistrarConsumoPayload[] = formRows.map(row => {
        const insumo = catalogo.find(i => i.id === row.insumoId)!;
        const qtyConvertida = getCantidadConvertida(Number(row.cantidad), row.unidadLocal, insumo.unidadMedida);
        
        return {
          ordenTrabajoId: formMaster.ordenTrabajo.trim(),
          insumoId: insumo.id,
          cantidad: qtyConvertida,
          tecnicoId: tecnico.id,
          tecnicoNombre: tecnico.nombre,
          areaId: tecnico.area,
          ...(row.justificacion.trim() && { justificacion: row.justificacion.trim() })
        };
      });

      // Execute all inserts concurrently
      const createdConsumos = await Promise.all(payloads.map(p => createConsumo(p)));
      
      setConsumos(prev => [...createdConsumos, ...prev]);
      setShowModal(false);
      resetForm();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudieron guardar algunos consumos.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        <p className="text-sm text-gray-500">Cargando consumos de insumos...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl">
            <FlaskConical className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Consumo de Insumos Técnicos</h1>
            <p className="text-sm text-gray-500">Aceites, filtros, pinturas, refrigerantes y consumibles de taller</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <PlusCircle size={18} />
          Registrar Consumo
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          {loadError}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-amber-50 rounded-lg"><DollarSign className="h-5 w-5 text-amber-600" /></div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Costo Total</p>
            <p className="text-xl font-bold text-gray-900">${fmt(totalCosto)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">OTs Procesadas</p>
            <p className="text-xl font-bold text-gray-900">{totalOTs}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-emerald-50 rounded-lg"><Package className="h-5 w-5 text-emerald-600" /></div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Costo / OT</p>
            <p className="text-xl font-bold text-gray-900">${fmt(ratioEficiencia)}</p>
          </div>
        </div>
        <div className={`bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm ${anomalyCount > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
          <div className={`p-2 rounded-lg ${anomalyCount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
            <ShieldAlert className={`h-5 w-5 ${anomalyCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Anomalías</p>
            <p className={`text-xl font-bold ${anomalyCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{anomalyCount}</p>
          </div>
        </div>
      </div>

      {/* ── Dashboard (jefe only) ── */}
      {role === 'jefe' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-amber-500" /> Dashboard de Eficiencia
            </h2>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm">
              {(['semanal', 'mensual', 'trimestral'] as Periodo[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodoVista(p)}
                  className={`px-3 py-1.5 font-medium capitalize transition-colors ${periodoVista === p ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tendencia de costo */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">Tendencia de Costo</p>
              <VerticalBar data={chartData} />
            </div>

            {/* Costo por categoría */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">Costo por Categoría de Insumo</p>
              <HorizontalBar data={categoryData} color="bg-blue-500" />
            </div>
          </div>

          {/* Costo por técnico */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-4">Costo Total por Técnico</p>
            <HorizontalBar data={tecnicoData} color="bg-emerald-500" />
          </div>

          {/* Anomalías */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-red-50 border-b border-red-100">
              <AlertTriangle className="text-red-500 shrink-0" size={18} />
              <h3 className="font-semibold text-red-700">Alertas de Anomalía de Consumo</h3>
              {anomalyCount > 0 && (
                <span className="ml-auto text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  {anomalyCount} alerta{anomalyCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {anomalyCount === 0 ? (
              <div className="px-5 py-4 text-emerald-600 flex items-center gap-2 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Sin anomalías detectadas en el período
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {materialAnomalies.map(({ record, mean, severity }) => (
                  <div key={record.id} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${severity === 'Alta' ? 'bg-red-600 text-white' : 'bg-red-200 text-red-800'}`}>
                      {severity}
                    </span>
                    <p className="text-sm text-red-800">
                      <span className="font-semibold">{record.tecnico}</span> — <span className="font-medium">{record.insumo}</span>:{' '}
                      ${fmt(record.costoTotal)} vs promedio ${fmt(mean)}
                    </p>
                  </div>
                ))}
                {technicianAnomalies.map(({ tecnico, pct }) => (
                  <div key={tecnico} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-300 text-amber-900">
                      Técnico
                    </span>
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">{tecnico}</span> consume <span className="font-semibold">{pct}%</span> sobre el promedio del equipo
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Tabla de Registros ── */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-semibold text-gray-800">
            Registros de Consumo <span className="text-gray-400 font-normal text-sm">({consumos.length} total)</span>
          </h2>
          <input
            type="text"
            placeholder="Buscar por OT, técnico o insumo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-64"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Fecha', 'OT', 'Técnico', 'Insumo', 'Categoría', 'Cantidad', 'Costo Total', 'Desviación'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">
                    {searchQuery ? 'Sin resultados para la búsqueda' : 'No hay registros de consumo'}
                  </td>
                </tr>
              ) : (
                paginatedItems.map(c => {
                  const catItem = catalogo.find(i => i.id === c.categoria);
                  const desviacion = catItem && catItem.consumoPromedioPorOT > 0
                    ? (c.cantidad - catItem.consumoPromedioPorOT) / catItem.consumoPromedioPorOT
                    : null;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(c.fecha)}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{c.ordenTrabajo}</td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{c.tecnico}</td>
                      <td className="px-4 py-2.5 text-gray-800">
                        {c.insumo}
                        {c.observacion && (
                          <p className="text-xs text-orange-600 mt-0.5 italic">{c.observacion}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {catItem?.tipo ?? c.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {c.cantidad} {c.unidad}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-gray-800 whitespace-nowrap">
                        ${fmt(c.costoTotal)}
                      </td>
                      <td className="px-4 py-2.5">
                        {desviacion !== null ? desviacionBadge(desviacion) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </section>

      {/* ── Modal Registro (Master-Detail) ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">Registrar Múltiples Insumos (Por OT)</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{saveError}</div>
              )}
              {catalogo.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
                  No hay insumos en el catálogo.
                </div>
              )}

              {/* Master: OT y Técnico */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de OT <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formMaster.ordenTrabajo}
                    onChange={e => setFormMaster(f => ({ ...f, ordenTrabajo: e.target.value }))}
                    placeholder="Ej: OT-2025-0210"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${formMasterErrors.ordenTrabajo ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {formMasterErrors.ordenTrabajo && <p className="text-xs text-red-500 mt-1">{formMasterErrors.ordenTrabajo}</p>}
                </div>
                <div className="relative z-20">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Técnico Líder <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formMaster.tecnicoDropdownOpen ? formMaster.tecnicoSearchQuery : (usuariosAsignables.find(u => u.id === formMaster.tecnicoId)?.nombre || '')}
                      onChange={e => setFormMaster(f => ({ ...f, tecnicoSearchQuery: e.target.value, tecnicoDropdownOpen: true }))}
                      onFocus={() => setFormMaster(f => ({ ...f, tecnicoDropdownOpen: true, tecnicoSearchQuery: '' }))}
                      placeholder="Buscar técnico..."
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${formMasterErrors.tecnicoId ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    {formMaster.tecnicoDropdownOpen && (
                      <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {(() => {
                          const filtrados = formMaster.tecnicoSearchQuery 
                            ? usuariosAsignables.filter(u => u.nombre.toLowerCase().includes(formMaster.tecnicoSearchQuery.toLowerCase()))
                            : usuariosAsignables;
                            
                          if (filtrados.length === 0) {
                            return <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>;
                          }
                          return filtrados.map(u => (
                            <div
                              key={u.id}
                              onClick={() => setFormMaster(f => ({ ...f, tecnicoId: u.id, tecnicoDropdownOpen: false, tecnicoSearchQuery: u.nombre }))}
                              className="px-3 py-2 text-sm hover:bg-amber-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center justify-between"
                            >
                              <span className="font-medium">{u.nombre}</span>
                              <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">{u.rol}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                  {formMaster.tecnicoDropdownOpen && (
                    <div className="fixed inset-0 z-10" onClick={() => setFormMaster(f => ({ ...f, tecnicoDropdownOpen: false }))} />
                  )}
                  {formMasterErrors.tecnicoId && <p className="text-xs text-red-500 mt-1">{formMasterErrors.tecnicoId}</p>}
                </div>
              </div>

              {/* Detail: Insumos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-700">Insumos a registrar</h4>
                  <button onClick={addRow} className="text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                    <PlusCircle size={14} /> Añadir fila
                  </button>
                </div>
                
                {formRows.map((row) => {
                  const errs = formRowsErrors[row.id] || {};
                  const insumo = catalogo.find(i => i.id === row.insumoId);
                  
                  // Combobox search logic
                  const filteredCatalogo = row.searchQuery 
                    ? catalogo.filter(i => i.nombre.toLowerCase().includes(row.searchQuery.toLowerCase()) || i.codigo.toLowerCase().includes(row.searchQuery.toLowerCase()))
                    : catalogo;

                  // Desviación
                  let desviacionPreview = 0;
                  if (insumo && Number(row.cantidad) > 0 && insumo.consumoPromedioPorOT > 0) {
                    const qtyConvertida = getCantidadConvertida(Number(row.cantidad), row.unidadLocal || insumo.unidadMedida, insumo.unidadMedida);
                    desviacionPreview = Math.abs((qtyConvertida - insumo.consumoPromedioPorOT) / insumo.consumoPromedioPorOT);
                  }
                  
                  let totalLine = 0;
                  if (insumo && Number(row.cantidad) > 0) {
                    const qtyConvertida = getCantidadConvertida(Number(row.cantidad), row.unidadLocal || insumo.unidadMedida, insumo.unidadMedida);
                    totalLine = qtyConvertida * insumo.costoUnitario;
                  }

                  return (
                    <div key={row.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-3 relative">
                      <div className="absolute top-3 right-3">
                        <button onClick={() => removeRow(row.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Eliminar fila">
                          <X size={16} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-12 gap-3 pr-6">
                        
                        {/* Buscador de Insumo (Combobox) */}
                        <div className="col-span-12 md:col-span-5 relative">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Insumo</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={row.dropdownOpen ? row.searchQuery : (insumo?.nombre || '')}
                              onChange={e => updateRow(row.id, { searchQuery: e.target.value, dropdownOpen: true })}
                              onFocus={() => updateRow(row.id, { dropdownOpen: true, searchQuery: '' })}
                              placeholder="Buscar insumo..."
                              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errs.insumoId ? 'border-red-400' : 'border-gray-300'}`}
                            />
                            {row.dropdownOpen && (
                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                {filteredCatalogo.length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
                                ) : (
                                  filteredCatalogo.map(i => (
                                    <div
                                      key={i.id}
                                      onClick={() => updateRow(row.id, { insumoId: i.id, dropdownOpen: false, searchQuery: i.nombre, unidadLocal: i.unidadMedida })}
                                      className="px-3 py-2 text-sm hover:bg-amber-50 cursor-pointer border-b border-gray-50 last:border-0 group"
                                    >
                                      <div className="font-medium text-gray-800 group-hover:text-amber-700 transition-colors">{i.nombre}</div>
                                      <div className="flex items-center justify-between mt-0.5">
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{i.codigo}</span>
                                        <span className="text-[10px] font-semibold text-gray-500">{i.unidadMedida} · ${fmt(i.costoUnitario)}</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                          {/* Invisible backdrop to close dropdown */}
                          {row.dropdownOpen && (
                            <div className="fixed inset-0 z-0" onClick={() => updateRow(row.id, { dropdownOpen: false })} />
                          )}
                          {errs.insumoId && <p className="text-xs text-red-500 mt-1">{errs.insumoId}</p>}
                        </div>

                        {/* Cantidad y Unidad */}
                        <div className="col-span-6 md:col-span-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad</label>
                          <div className="flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
                            <input
                              type="number"
                              min="0.01" step="0.01"
                              value={row.cantidad}
                              onChange={e => updateRow(row.id, { cantidad: e.target.value })}
                              placeholder="0.00"
                              className="w-1/2 px-2 py-2 text-sm focus:outline-none"
                            />
                            <select
                              value={row.unidadLocal || (insumo?.unidadMedida ?? '')}
                              onChange={e => updateRow(row.id, { unidadLocal: e.target.value })}
                              disabled={!insumo}
                              className="w-1/2 bg-gray-50 px-1 py-2 text-xs border-l focus:outline-none text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {insumo ? (
                                ['litros', 'litro', 'galones', 'galon', 'tazas', 'taza', 'tapas', 'tapa'].includes(insumo.unidadMedida?.trim().toLowerCase() || '') ? (
                                  <>
                                    <option value="litros">Litros</option>
                                    <option value="tazas">Tazas</option>
                                    <option value="galones">Galones</option>
                                  </>
                                ) : (
                                  <option value={insumo.unidadMedida || ''}>{insumo.unidadMedida || 'Unidad'}</option>
                                )
                              ) : (
                                <option value="">Sel. Insumo</option>
                              )}
                            </select>
                          </div>
                          {errs.cantidad && <p className="text-xs text-red-500 mt-1">{errs.cantidad}</p>}
                        </div>

                        {/* Costo Info */}
                        <div className="col-span-6 md:col-span-4 flex items-end justify-end pb-1">
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase">Costo Estimado</p>
                            <p className="text-lg font-bold text-gray-700">${fmt(totalLine)}</p>
                          </div>
                        </div>

                        {/* Justificación if needed */}
                        <div className="col-span-12">
                          {(desviacionPreview > 0.2 || errs.justificacion) && (
                            <div className="flex gap-2 items-start mt-2">
                              <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={16} />
                              <div className="flex-1">
                                <textarea
                                  value={row.justificacion}
                                  onChange={e => updateRow(row.id, { justificacion: e.target.value })}
                                  placeholder="Justificación requerida (desviación > 20%)"
                                  rows={1}
                                  className={`w-full text-xs border rounded-lg px-3 py-1.5 focus:outline-none resize-none ${errs.justificacion ? 'border-red-400 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
                                />
                                {errs.justificacion && <p className="text-[10px] text-red-500 font-medium">{errs.justificacion}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Summary */}
              {formRows.some(r => r.insumoId && Number(r.cantidad) > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-amber-800">Costo Total de la OT</span>
                  <span className="text-xl font-bold text-amber-700">
                    ${fmt(formRows.reduce((sum, row) => {
                      const ins = catalogo.find(i => i.id === row.insumoId);
                      if (!ins) return sum;
                      const q = getCantidadConvertida(Number(row.cantidad) || 0, row.unidadLocal || ins.unidadMedida, ins.unidadMedida);
                      return sum + (q * ins.costoUnitario);
                    }, 0))}
                  </span>
                </div>
              )}

            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || catalogo.length === 0}
                className="px-6 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Guardando OT…' : 'Registrar Insumos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
