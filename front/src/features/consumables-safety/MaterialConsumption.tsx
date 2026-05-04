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

  // ── Form state ───────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ordenTrabajo: '', insumoId: '', tecnicoId: '', cantidad: '', justificacion: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedInsumo = catalogo.find(i => i.id === form.insumoId) ?? null;
  const selectedTecnico = usuariosAsignables.find(u => u.id === form.tecnicoId) ?? null;
  const cantidadNum = Number(form.cantidad);
  const desviacionPreview = selectedInsumo && cantidadNum > 0 && selectedInsumo.consumoPromedioPorOT > 0
    ? Math.abs((cantidadNum - selectedInsumo.consumoPromedioPorOT) / selectedInsumo.consumoPromedioPorOT)
    : 0;
  const requiereJustificacion = desviacionPreview > 0.2;
  const costoPreview = selectedInsumo && cantidadNum > 0 ? cantidadNum * selectedInsumo.costoUnitario : null;

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

  function resetForm() {
    setForm({ ordenTrabajo: '', insumoId: '', tecnicoId: '', cantidad: '', justificacion: '' });
    setFormErrors({});
    setSaveError('');
  }

  function validateForm() {
    const errors: Record<string, string> = {};
    if (!form.ordenTrabajo.trim()) errors.ordenTrabajo = 'Número de OT requerido';
    if (!form.insumoId) errors.insumoId = 'Seleccione un insumo del catálogo';
    if (!form.tecnicoId) errors.tecnicoId = 'Seleccione un usuario';
    if (!form.cantidad || cantidadNum <= 0) errors.cantidad = 'Ingrese una cantidad mayor a 0';
    if (requiereJustificacion && !form.justificacion.trim())
      errors.justificacion = 'Se requiere justificación cuando la cantidad se desvía más del 20%';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm() || !selectedInsumo || !selectedTecnico) return;
    setSaveError('');
    const payload: RegistrarConsumoPayload = {
      ordenTrabajoId: form.ordenTrabajo.trim(),
      insumoId: selectedInsumo.id,
      cantidad: cantidadNum,
      tecnicoId: selectedTecnico.id,
      tecnicoNombre: selectedTecnico.nombre,
      areaId: selectedTecnico.area,
      ...(form.justificacion.trim() && { justificacion: form.justificacion.trim() }),
    };
    setSaving(true);
    try {
      const created = await createConsumo(payload);
      setConsumos(prev => [created, ...prev]);
      setShowModal(false);
      resetForm();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el consumo');
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

      {/* ── Modal Registro ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">Registrar Consumo de Insumo</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{saveError}</div>
              )}
              {catalogo.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
                  No hay insumos en el catálogo. Agregue insumos primero.
                </div>
              )}

              {/* OT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de OT <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.ordenTrabajo}
                  onChange={e => setForm(f => ({ ...f, ordenTrabajo: e.target.value }))}
                  placeholder="Ej: OT-2025-0210"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${formErrors.ordenTrabajo ? 'border-red-400' : 'border-gray-300'}`}
                />
                {formErrors.ordenTrabajo && <p className="text-xs text-red-500 mt-1">{formErrors.ordenTrabajo}</p>}
              </div>

              {/* Insumo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insumo <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.insumoId}
                  onChange={e => setForm(f => ({ ...f, insumoId: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 ${formErrors.insumoId ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Seleccionar insumo del catálogo…</option>
                  {catalogo.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.nombre} ({i.unidadMedida}) — ${i.costoUnitario}/{i.unidadMedida}
                    </option>
                  ))}
                </select>
                {formErrors.insumoId && <p className="text-xs text-red-500 mt-1">{formErrors.insumoId}</p>}
                {selectedInsumo && (
                  <p className="text-xs text-gray-500 mt-1">
                    Promedio por OT: <strong>{selectedInsumo.consumoPromedioPorOT} {selectedInsumo.unidadMedida}</strong>
                    {selectedInsumo.stockActual != null && <> · Stock: <strong>{selectedInsumo.stockActual}</strong></>}
                  </p>
                )}
              </div>

              {/* Técnico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario asignable <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.tecnicoId}
                  onChange={e => setForm(f => ({ ...f, tecnicoId: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 ${formErrors.tecnicoId ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Seleccionar usuario…</option>
                  {usuariosAsignables.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} — {u.rol}</option>
                  ))}
                </select>
                {formErrors.tecnicoId && <p className="text-xs text-red-500 mt-1">{formErrors.tecnicoId}</p>}
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad{selectedInsumo ? ` (${selectedInsumo.unidadMedida})` : ''} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.cantidad}
                  onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
                  placeholder="0.00"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${formErrors.cantidad ? 'border-red-400' : 'border-gray-300'}`}
                />
                {formErrors.cantidad && <p className="text-xs text-red-500 mt-1">{formErrors.cantidad}</p>}
                {selectedInsumo && requiereJustificacion && (
                  <p className="text-xs text-amber-700 mt-1">
                    Desviación &gt;20% del promedio — se requiere justificación.
                  </p>
                )}
              </div>

              {/* Justificación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Justificación {requiereJustificacion && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={form.justificacion}
                  onChange={e => setForm(f => ({ ...f, justificacion: e.target.value }))}
                  placeholder="Explique el motivo si el consumo supera la tolerancia"
                  rows={2}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none ${formErrors.justificacion ? 'border-red-400' : 'border-gray-300'}`}
                />
                {formErrors.justificacion && <p className="text-xs text-red-500 mt-1">{formErrors.justificacion}</p>}
              </div>

              {/* Costo preview */}
              {costoPreview !== null && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-800">Costo Total Estimado</span>
                  <span className="text-lg font-bold text-amber-700">${fmt(costoPreview)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Guardando…' : 'Guardar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
