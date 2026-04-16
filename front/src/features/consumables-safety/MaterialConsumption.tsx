import { useState, useEffect } from 'react';
import { FlaskConical, AlertTriangle, PlusCircle, X, Loader2 } from 'lucide-react';
import { useRole } from '@shared/context/AssetContext';
import { computeStats } from '@shared/utils/stats';
import { Pagination } from '@shared/components';
import { usePagination } from '@shared/hooks/usePagination';
import { getConsumos, createConsumo, getCatalogoInsumos } from '../../services/consumablesService';
import type { ConsumoInsumo, CatalogoInsumo, RegistrarConsumoPayload } from '../../services/consumablesService';
import { getUsuariosAsignables } from '../../services/usuariosService';
import type { Usuario } from '../../services/usuariosService';

// ─── Component ─────────────────────────────────────────────────────────────

export function MaterialConsumption() {
  const role = useRole();
  const [consumos, setConsumos] = useState<ConsumoInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogo, setCatalogo] = useState<CatalogoInsumo[]>([]);
  const [usuariosAsignables, setUsuariosAsignables] = useState<Usuario[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([getConsumos(), getCatalogoInsumos(), getUsuariosAsignables()]).then(([rConsumos, rCatalogo, rUsuarios]) => {
      if (cancelled) return;
      if (rConsumos.status === 'fulfilled') setConsumos(rConsumos.value);
      if (rCatalogo.status === 'fulfilled') setCatalogo(rCatalogo.value);
      if (rUsuarios.status === 'fulfilled') setUsuariosAsignables(rUsuarios.value);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);
  const [periodoVista, setPeriodoVista] = useState<'semanal' | 'mensual'>('mensual');

  // Form state — F11.1
  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState({
    ordenTrabajo: '',
    insumoId: '',
    tecnicoId: '',
    cantidad: '',
    justificacion: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string>('');

  // Insumo seleccionado del catálogo
  const selectedInsumo = catalogo.find(i => i.id === form.insumoId) ?? null;
  const selectedTecnico = usuariosAsignables.find((u) => u.id === form.tecnicoId) ?? null;
  const cantidadNumerica = Number(form.cantidad);
  const desviacionAbsoluta = selectedInsumo && cantidadNumerica > 0 && selectedInsumo.consumoPromedioPorOT > 0
    ? Math.abs((cantidadNumerica - selectedInsumo.consumoPromedioPorOT) / selectedInsumo.consumoPromedioPorOT)
    : 0;
  const requiereJustificacion = desviacionAbsoluta > 0.2;

  // ── Derived values ───────────────────────────────────────────────────────

  const sortedConsumos = [...consumos].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  const {
    paginatedItems: pageConsumos,
    currentPage, pageSize, setCurrentPage, setPageSize, totalItems: totalConsumos,
  } = usePagination(sortedConsumos, 10);

  // ── F11.2 — Efficiency dashboard ─────────────────────────────────────────

  // Filter consumos based on current period view
  const now = new Date('2025-03-27'); // reference date matching prototype context
  const filteredConsumos = consumos.filter(c => {
    const d = new Date(c.fecha);
    if (periodoVista === 'semanal') {
      const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    } else {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
  });

  const totalCosto = filteredConsumos.reduce((sum, c) => sum + c.costoTotal, 0);
  const uniqueOTs = new Set(filteredConsumos.map(c => c.ordenTrabajo)).size;
  const ratioEficiencia = uniqueOTs > 0 ? (totalCosto / uniqueOTs).toFixed(2) : '0.00';

  // Trend chart — group by week or month (last 6 periods from all consumos)
  function getChartData(): { label: string; total: number }[] {
    const groups: Record<string, number> = {};

    consumos.forEach(c => {
      const d = new Date(c.fecha);
      let key: string;
      if (periodoVista === 'semanal') {
        // ISO week number
        const jan1 = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil(
          ((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
        );
        key = `${d.getFullYear()}-S${weekNum}`;
      } else {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      }
      groups[key] = (groups[key] ?? 0) + c.costoTotal;
    });

    const entries = Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);

    return entries.map(([label, total]) => ({ label, total }));
  }

  const chartData = getChartData();
  const maxGroupTotal = Math.max(...chartData.map(g => g.total), 1);

  // ── F11.3 — Anomaly detection ────────────────────────────────────────────

  interface MaterialAnomaly {
    record: ConsumoInsumo;
    mean: number;
    stdDev: number;
    severity: 'Alta' | 'Media';
  }

  interface TechnicianAnomaly {
    tecnico: string;
    total: number;
    peerMean: number;
    pct: number;
  }

  const materialAnomalies: MaterialAnomaly[] = [];
  const technicianAnomalies: TechnicianAnomaly[] = [];

  if (role === 'jefe') {
    // Per-material anomaly detection
    const byInsumo: Record<string, ConsumoInsumo[]> = {};
    consumos.forEach(c => {
      if (!byInsumo[c.insumo]) byInsumo[c.insumo] = [];
      byInsumo[c.insumo].push(c);
    });

    Object.values(byInsumo).forEach(group => {
      const values = group.map(c => c.costoTotal);
      const { mean, stdDev } = computeStats(values);
      group.forEach(record => {
        if (record.costoTotal > mean + stdDev) {
          const severity: 'Alta' | 'Media' =
            record.costoTotal > mean + 2 * stdDev ? 'Alta' : 'Media';
          materialAnomalies.push({ record, mean, stdDev, severity });
        }
      });
    });

    // Per-technician peer comparison
    const byTecnico: Record<string, number> = {};
    consumos.forEach(c => {
      byTecnico[c.tecnico] = (byTecnico[c.tecnico] ?? 0) + c.costoTotal;
    });
    const techTotals = Object.values(byTecnico);
    const { mean: peerMean } = computeStats(techTotals);

    Object.entries(byTecnico).forEach(([tecnico, total]) => {
      if (total > peerMean * 1.25) {
        const pct = Math.round(((total - peerMean) / peerMean) * 100);
        technicianAnomalies.push({ tecnico, total, peerMean, pct });
      }
    });
  }

  const hasAnomalies = materialAnomalies.length > 0 || technicianAnomalies.length > 0;

  // ── Form handlers — F11.1 ────────────────────────────────────────────────

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!form.ordenTrabajo.trim()) errors.ordenTrabajo = 'Número de OT requerido';
    if (!form.insumoId) errors.insumoId = 'Seleccione un insumo del catálogo';
    if (!form.tecnicoId) errors.tecnicoId = 'Seleccione un usuario asignable';
    if (!form.cantidad || Number(form.cantidad) <= 0)
      errors.cantidad = 'Ingrese una cantidad mayor a 0';
    if (selectedTecnico && !selectedTecnico.area) {
      errors.tecnicoId = 'El usuario seleccionado no tiene área válida para asignación';
    }
    if (requiereJustificacion && !form.justificacion.trim()) {
      errors.justificacion = 'Se requiere justificación cuando la cantidad se desvía más del 20% del promedio';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!validateForm() || !selectedInsumo || !selectedTecnico) return;
    setSaveError('');

    const payload: RegistrarConsumoPayload = {
      ordenTrabajoId: form.ordenTrabajo.trim(),
      insumoId: selectedInsumo.id,
      cantidad: Number(form.cantidad),
      tecnicoId: selectedTecnico.id,
      tecnicoNombre: selectedTecnico.nombre,
      areaId: selectedTecnico.area,
      ...(form.justificacion.trim() && { justificacion: form.justificacion.trim() }),
    };

    setSaving(true);
    try {
      const created = await createConsumo(payload);
      setConsumos(prev => [...prev, created]);
      setShowFormModal(false);
      setForm({ ordenTrabajo: '', insumoId: '', tecnicoId: '', cantidad: '', justificacion: '' });
      setFormErrors({});
    } catch (err) {
      console.error('[MaterialConsumption] Error al guardar consumo:', err);
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el consumo');
    } finally {
      setSaving(false);
    }
  }

  function handleCloseModal() {
    setShowFormModal(false);
    setSaveError('');
    setFormErrors({});
    setForm({ ordenTrabajo: '', insumoId: '', tecnicoId: '', cantidad: '', justificacion: '' });
  }

  const costoTotalPreview = selectedInsumo && form.cantidad
    ? (Number(form.cantidad) * selectedInsumo.costoUnitario).toFixed(2)
    : '—';

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          <p className="text-sm text-gray-500">Cargando consumos de insumos...</p>
        </div>
      )}

      {!loading && <>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <FlaskConical className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Consumo de Insumos Técnicos — C11</h1>
            <p className="text-sm text-gray-500">Consumibles de taller utilizados en órdenes de trabajo: aceites, filtros, refrigerantes, frenos y eléctrico</p>
          </div>
        </div>
        <button
          onClick={() => setShowFormModal(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <PlusCircle size={18} />
          Registrar Consumo Técnico (F11.1)
        </button>
      </div>

      {/* ── F11.2 — Efficiency Dashboard (jefe only) ── */}
      {role === 'jefe' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-gray-700">Dashboard de Eficiencia — F11.2</h2>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button
                onClick={() => setPeriodoVista('semanal')}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  periodoVista === 'semanal'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setPeriodoVista('mensual')}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  periodoVista === 'mensual'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Mensual
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Total Consumo del Período
              </p>
              <p className="text-2xl font-bold text-amber-600">
                ${totalCosto.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                OTs Procesadas
              </p>
              <p className="text-2xl font-bold text-blue-600">{uniqueOTs}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Ratio Eficiencia
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                ${ratioEficiencia}
                <span className="text-sm font-normal text-gray-500 ml-1">$/OT</span>
              </p>
            </div>
          </div>

          {/* Trend Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-4">
              Tendencia de Consumo ({periodoVista === 'semanal' ? 'por semana' : 'por mes'})
            </p>
            {chartData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin datos para el período</p>
            ) : (
              <div className="flex items-end gap-3 h-[120px]">
                {chartData.map(group => (
                  <div key={group.label} className="flex flex-col items-center flex-1 min-w-0 h-full justify-end gap-1">
                    <div
                      className="w-full bg-amber-400 rounded-t-md transition-all"
                      style={{ height: `${((group.total / maxGroupTotal) * 100).toFixed(0)}%` }}
                    />
                    <span className="text-[10px] text-gray-500 truncate w-full text-center leading-tight">
                      {group.label}
                    </span>
                    <span className="text-[10px] font-medium text-amber-700 truncate w-full text-center">
                      ${group.total.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── F11.3 — Anomaly Alerts (jefe only) ── */}
      {role === 'jefe' && (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-100">
            <AlertTriangle className="text-red-500 shrink-0" size={20} />
            <h2 className="text-base font-semibold text-red-700">
              Alertas de Anomalía — F11.3
            </h2>
          </div>

          {!hasAnomalies ? (
            <div className="flex items-center gap-2 px-4 py-4 text-emerald-600">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium">Sin anomalías detectadas</span>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Material anomalies */}
              {materialAnomalies.map(({ record, mean, severity }) => (
                <div
                  key={record.id}
                  className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3"
                >
                  <span
                    className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                      severity === 'Alta'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {severity}
                  </span>
                  <p className="text-sm text-red-800">
                    <span className="font-medium">{record.tecnico}</span> —{' '}
                    <span className="font-medium">{record.insumo}</span>:{' '}
                    ${record.costoTotal.toFixed(2)} vs promedio ${mean.toFixed(2)}
                  </p>
                </div>
              ))}

              {/* Technician peer anomalies */}
              {technicianAnomalies.map(({ tecnico, pct }) => (
                <div
                  key={tecnico}
                  className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3"
                >
                  <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-300 text-amber-900">
                    Media
                  </span>
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">{tecnico}</span> consume{' '}
                    <span className="font-medium">{pct}%</span> sobre el promedio del equipo
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Full Consumption Table (all roles) ── */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-700">
            Registro de Consumos ({consumos.length} registros)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Fecha', 'OT', 'Técnico', 'Insumo', 'Categoría', 'Cantidad', 'Costo Total'].map(
                  h => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageConsumos.map(c => {
                const isAnomaly = c.observacion?.includes('ANOMALÍA');
                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      isAnomaly ? 'border-l-4 border-l-orange-400' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{c.fecha}</td>
                    <td className="px-4 py-2.5 text-gray-800 font-medium whitespace-nowrap">
                      {c.ordenTrabajo}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{c.tecnico}</td>
                    <td className="px-4 py-2.5 text-gray-800">
                      {c.insumo}
                      {c.observacion && (
                        <p className="text-xs text-orange-600 mt-0.5">{c.observacion}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {c.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      {c.cantidad} {c.unidad}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-800 whitespace-nowrap">
                      ${c.costoTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination
            currentPage={currentPage}
            totalItems={totalConsumos}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </section>

      {/* ── Info Footer ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">Permisos por rol:</p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-700">
          <li>
            <span className="font-medium">Personal / Técnico:</span> puede registrar consumos y consultar el historial de registros.
          </li>
          <li>
            <span className="font-medium">Jefe de Taller:</span> accede además al dashboard de eficiencia (F11.2) y a las alertas de anomalía (F11.3), con comparativa por insumo y por técnico.
          </li>
        </ul>
      </div>

      {/* ── F11.1 — Registration Modal ── */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                Registrar Consumo de Insumo Técnico (F11.1)
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-4 space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              {/* Advertencia si el catálogo está vacío */}
              {catalogo.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
                  No hay insumos registrados. Agregue insumos en <strong>Catálogo de Insumos</strong> antes de registrar consumos.
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
                  placeholder="Ej. OT-2025-0210"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    formErrors.ordenTrabajo ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {formErrors.ordenTrabajo && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.ordenTrabajo}</p>
                )}
              </div>

              {/* Insumo del catálogo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insumo <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.insumoId}
                  onChange={e => setForm(f => ({ ...f, insumoId: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    formErrors.insumoId ? 'border-red-400' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar insumo del catálogo…</option>
                  {catalogo.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.nombre} — {i.tipo} ({i.unidadMedida}) — ${i.costoUnitario.toFixed(2)}/{i.unidadMedida}
                    </option>
                  ))}
                </select>
                {formErrors.insumoId && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.insumoId}</p>
                )}
                {selectedInsumo && (
                  <p className="text-xs text-gray-500 mt-1">
                    Consumo promedio por OT: <strong>{selectedInsumo.consumoPromedioPorOT} {selectedInsumo.unidadMedida}</strong>
                    {selectedInsumo.stockActual != null && (
                      <> · Stock disponible: <strong>{selectedInsumo.stockActual} {selectedInsumo.unidadMedida}</strong></>
                    )}
                  </p>
                )}
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario asignable <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.tecnicoId}
                  onChange={e => setForm(f => ({ ...f, tecnicoId: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    formErrors.tecnicoId ? 'border-red-400' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar usuario elegible…</option>
                  {usuariosAsignables.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} — {u.rol}
                    </option>
                  ))}
                </select>
                {formErrors.tecnicoId && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.tecnicoId}</p>
                )}
                {selectedTecnico && (
                  <p className="text-xs text-gray-500 mt-1">
                    Área de asignación: <strong>{selectedTecnico.area}</strong>
                  </p>
                )}
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
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    formErrors.cantidad ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {formErrors.cantidad && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.cantidad}</p>
                )}
                {selectedInsumo && requiereJustificacion && (
                  <p className="text-xs text-amber-700 mt-1">
                    La cantidad se desvía más del 20% del promedio ({selectedInsumo.consumoPromedioPorOT} {selectedInsumo.unidadMedida});
                    agregue justificación para registrar.
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
                  placeholder="Explique motivo cuando el consumo supera la tolerancia"
                  rows={2}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none ${
                    formErrors.justificacion ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {formErrors.justificacion && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.justificacion}</p>
                )}
              </div>

              {/* Auto-computed Total */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-amber-800">Costo Total (calculado)</span>
                <span className="text-lg font-bold text-amber-700">
                  {costoTotalPreview !== '—' ? `$${costoTotalPreview}` : '—'}
                </span>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Guardando...' : 'Guardar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
