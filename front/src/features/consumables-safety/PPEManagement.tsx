import { useState, useEffect } from 'react';
import { HardHat, Plus, X, AlertTriangle, CheckCircle, Users, Package, Loader2 } from 'lucide-react';
import { useRole } from '@shared/context/AssetContext';
import { computeStats } from '@shared/utils/stats';
import { Pagination } from '@shared/components';
import { usePagination } from '@shared/hooks/usePagination';
import { getEntregasEPP, createEntregaEPP, getCatalogoEPP } from '../../services/consumablesService';
import type { EntregaEPP, CategoriaEPP } from '../../services/consumablesService';
import { getUsuarios } from '../../services/usuariosService';
import { getAreas } from '../../services/assetService';

type AlertItem = {
  type: 'early' | 'excess';
  tecnico: string;
  item?: string;
  description: string;
  severity: 'Media' | 'Alta';
};

export function PPEManagement() {
  const role = useRole();
  const [entregas, setEntregas] = useState<EntregaEPP[]>([]);
  const [loading, setLoading] = useState(true);

  const [tecnicosList, setTecnicosList] = useState<string[]>([]);
  const [areasList, setAreasList] = useState<string[]>([]);
  const [itemsEPP, setItemsEPP] = useState<string[]>([]);
  const [categoriasEPP, setCategoriasEPP] = useState<CategoriaEPP[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getEntregasEPP(),
      getUsuarios().catch(() => []),
      getAreas().catch(() => []),
      getCatalogoEPP().catch(() => []),
    ]).then(([data, usuarios, areas, catalogo]) => {
      if (!cancelled) {
        setEntregas(data);
        setTecnicosList(usuarios.map(u => u.nombre));
        setAreasList(areas.map(a => a.nombre));
        setItemsEPP(catalogo.map(c => c.nombre));
        const cats = Array.from(new Set(catalogo.map(c => c.categoria))) as CategoriaEPP[];
        setCategoriasEPP(cats.length > 0 ? cats : ['Guantes', 'Lentes', 'Calzado', 'Mascarilla', 'Overol', 'Otro']);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);
  const [filterTecnico, setFilterTecnico] = useState<string>('Todos');
  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState({
    tecnico: '',
    area: '',
    item: '',
    categoria: '' as CategoriaEPP | '',
    cantidad: '',
    fechaEntrega: '',
    fechaReposicionProgramada: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ─── Unique technician names from current entregas ────────────────────────
  const uniqueTecnicos = Array.from(new Set(entregas.map(e => e.tecnico))).sort();

  // ─── Filtered table rows ──────────────────────────────────────────────────
  const filteredEntregas =
    filterTecnico === 'Todos'
      ? entregas
      : entregas.filter(e => e.tecnico === filterTecnico);

  const {
    paginatedItems: pageEntregas,
    currentPage: entregasPage, pageSize: entregasPageSize,
    setCurrentPage: setEntregasPage, setPageSize: setEntregasPageSize,
    totalItems: totalEntregas,
  } = usePagination(filteredEntregas, 10);

  // ─── F12.2 — Per-technician totals ────────────────────────────────────────
  const totalByTecnico: Record<string, { total: number; area: string }> = {};
  for (const e of entregas) {
    if (!totalByTecnico[e.tecnico]) {
      totalByTecnico[e.tecnico] = { total: 0, area: e.area };
    }
    totalByTecnico[e.tecnico].total += e.cantidad;
  }

  const tecnicoTotals = Object.entries(totalByTecnico).map(([name, data]) => ({
    name,
    area: data.area,
    total: data.total,
  }));

  const allTotals = tecnicoTotals.map(t => t.total);
  const { mean: areaAvg } = computeStats(allTotals);

  const tecnicoRows = tecnicoTotals
    .map(t => {
      const deviation = areaAvg > 0 ? Math.abs((t.total - areaAvg) / areaAvg) * 100 : 0;
      let badge: 'Normal' | 'Elevado' | 'Crítico' = 'Normal';
      if (deviation > 30) badge = 'Crítico';
      else if (deviation > 15) badge = 'Elevado';
      return { ...t, deviation, badge };
    })
    .sort((a, b) => b.deviation - a.deviation);

  const {
    paginatedItems: pageTecnicoRows,
    currentPage: compPage, pageSize: compPageSize,
    setCurrentPage: setCompPage, setPageSize: setCompPageSize,
    totalItems: totalTecnicoRows,
  } = usePagination(tecnicoRows, 10);

  // ─── F12.3 — Alerts ───────────────────────────────────────────────────────
  const alerts: AlertItem[] = [];

  // Alert type 1 — Early replenishment: rows with "ALERTA" in observacion
  for (const e of entregas) {
    if (e.observacion && e.observacion.includes('ALERTA')) {
      alerts.push({
        type: 'early',
        tecnico: e.tecnico,
        item: e.item,
        description: `Reposición anticipada detectada para "${e.item}". Se entregó antes de la fecha programada de reposición anterior.`,
        severity: 'Media',
      });
    }
  }

  // Alert type 2 — Excessive consumption
  const totalPorTecnicoArr = tecnicoTotals.map(t => t.total);
  const { mean: consumoMean } = computeStats(totalPorTecnicoArr);

  for (const t of tecnicoTotals) {
    if (t.total > consumoMean * 1.50) {
      alerts.push({
        type: 'excess',
        tecnico: t.name,
        description: `Consumo total de ${t.total} unidades — supera en más del 50% el promedio del área (${consumoMean.toFixed(1)} unidades).`,
        severity: 'Alta',
      });
    } else if (t.total > consumoMean * 1.30) {
      alerts.push({
        type: 'excess',
        tecnico: t.name,
        description: `Consumo total de ${t.total} unidades — supera entre 30% y 50% el promedio del área (${consumoMean.toFixed(1)} unidades).`,
        severity: 'Media',
      });
    }
  }

  // ─── KPI values ───────────────────────────────────────────────────────────
  const kpiTotalEntregas = entregas.length;
  const kpiAlertasActivas = alerts.length;
  const kpiTecnicosMonitoreados = uniqueTecnicos.length;

  // ─── Form helpers ─────────────────────────────────────────────────────────
  function resetForm() {
    setForm({
      tecnico: '',
      area: '',
      item: '',
      categoria: '',
      cantidad: '',
      fechaEntrega: '',
      fechaReposicionProgramada: '',
    });
    setFormErrors({});
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!form.tecnico) errors.tecnico = 'Seleccione un técnico';
    if (!form.area) errors.area = 'Seleccione un área';
    if (!form.item) errors.item = 'Ingrese el ítem EPP';
    if (!form.categoria) errors.categoria = 'Seleccione una categoría';
    if (!form.cantidad || Number(form.cantidad) <= 0)
      errors.cantidad = 'Ingrese una cantidad mayor a 0';
    if (!form.fechaEntrega) errors.fechaEntrega = 'Ingrese la fecha de entrega';
    if (!form.fechaReposicionProgramada)
      errors.fechaReposicionProgramada = 'Ingrese la fecha de reposición programada';
    if (
      form.fechaEntrega &&
      form.fechaReposicionProgramada &&
      form.fechaReposicionProgramada < form.fechaEntrega
    ) {
      errors.fechaReposicionProgramada =
        'La fecha de reposición debe ser igual o posterior a la fecha de entrega';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!validateForm()) return;
    const payload: Omit<EntregaEPP, 'id'> = {
      tecnico: form.tecnico,
      area: form.area,
      item: form.item,
      categoria: form.categoria as CategoriaEPP,
      cantidad: Number(form.cantidad),
      fechaEntrega: form.fechaEntrega,
      fechaReposicionProgramada: form.fechaReposicionProgramada,
      entregadoPor: form.tecnico,
    };

    setSaving(true);
    try {
      const created = await createEntregaEPP(payload);
      setEntregas(prev => [created, ...prev]);
      setShowFormModal(false);
      resetForm();
    } catch (err) {
      console.error('[PPEManagement] Error al guardar entrega EPP:', err);
    } finally {
      setSaving(false);
    }
  }

  function isAlertRow(e: EntregaEPP): boolean {
    return !!(
      e.observacion &&
      (e.observacion.includes('ALERTA') || e.observacion.includes('ANOMALÍA'))
    );
  }

  // ─── Badge helpers ────────────────────────────────────────────────────────
  function categoriaBadge(cat: CategoriaEPP) {
    const map: Record<CategoriaEPP, string> = {
      Guantes: 'bg-blue-100 text-blue-700',
      Lentes: 'bg-purple-100 text-purple-700',
      Calzado: 'bg-yellow-100 text-yellow-700',
      Mascarilla: 'bg-pink-100 text-pink-700',
      Overol: 'bg-indigo-100 text-indigo-700',
      Otro: 'bg-gray-100 text-gray-700',
    };
    return map[cat] ?? 'bg-gray-100 text-gray-700';
  }

  function desvBadge(badge: 'Normal' | 'Elevado' | 'Crítico') {
    if (badge === 'Normal') return 'bg-emerald-100 text-emerald-700';
    if (badge === 'Elevado') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  }

  function severityBadge(s: 'Media' | 'Alta') {
    return s === 'Alta'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700';
  }

  return (
    <div className="p-6 space-y-6">
      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          <p className="text-sm text-gray-500">Cargando entregas de EPP...</p>
        </div>
      )}

      {!loading && <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <HardHat className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de EPP — C12</h1>
            <p className="text-sm text-gray-500">Equipos de Protección Personal: vestimenta y dispositivos de seguridad para proteger al trabajador (guantes, gafas, calzado, overol, mascarilla, protección auditiva)</p>
          </div>
        </div>
        {role === 'tecnico' && (
          <button
            onClick={() => setShowFormModal(true)}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva Entrega EPP (F12.1)
          </button>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg">
            <Package className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{kpiTotalEntregas}</p>
            <p className="text-sm text-gray-500">Total Entregas Registradas</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{kpiAlertasActivas}</p>
            <p className="text-sm text-gray-500">Alertas Activas</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{kpiTecnicosMonitoreados}</p>
            <p className="text-sm text-gray-500">Técnicos Monitoreados</p>
          </div>
        </div>
      </div>

      {/* ── History Table (tecnico + jefe) ── */}
      {(role === 'tecnico' || role === 'jefe') && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-gray-800">Historial de Entregas EPP</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium">Filtrar por técnico:</label>
              <select
                value={filterTecnico}
                onChange={e => setFilterTecnico(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Todos">Todos</option>
                {uniqueTecnicos.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Técnico</th>
                  <th className="px-4 py-3 text-left">Área</th>
                  <th className="px-4 py-3 text-left">Ítem EPP</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3 text-left">Fecha Entrega</th>
                  <th className="px-4 py-3 text-left">Fecha Reposición</th>
                  <th className="px-4 py-3 text-left">Entregado Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageEntregas.map(e => (
                  <tr
                    key={e.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      isAlertRow(e) ? 'border-l-4 border-l-orange-400' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">{e.tecnico}</td>
                    <td className="px-4 py-3 text-gray-600">{e.area}</td>
                    <td className="px-4 py-3 text-gray-700">{e.item}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoriaBadge(e.categoria)}`}>
                        {e.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{e.cantidad}</td>
                    <td className="px-4 py-3 text-gray-600">{e.fechaEntrega}</td>
                    <td className="px-4 py-3 text-gray-600">{e.fechaReposicionProgramada}</td>
                    <td className="px-4 py-3 text-gray-600">{e.entregadoPor}</td>
                  </tr>
                ))}
                {filteredEntregas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No hay entregas registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination
              currentPage={entregasPage}
              totalItems={totalEntregas}
              pageSize={entregasPageSize}
              onPageChange={setEntregasPage}
              onPageSizeChange={setEntregasPageSize}
            />
          </div>
        </div>
      )}

      {/* ── F12.2 — Comparative table by technician (jefe only) ── */}
      {role === 'jefe' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Comparativa EPP por Técnico — F12.2</h2>
            <p className="text-sm text-gray-500 mt-1">
              Consumo total vs. promedio del área. Desviación porcentual respecto al promedio.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Técnico</th>
                  <th className="px-4 py-3 text-left">Área</th>
                  <th className="px-4 py-3 text-right">Total Unidades</th>
                  <th className="px-4 py-3 text-right">Desviación del Promedio</th>
                  <th className="px-4 py-3 text-center">Indicador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageTecnicoRows.map(row => (
                  <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-gray-600">{row.area}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.total}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {row.deviation.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${desvBadge(row.badge)}`}>
                        {row.badge}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Reference row — area average */}
                <tr className="bg-gray-50 font-semibold text-gray-700 border-t-2 border-gray-200">
                  <td className="px-4 py-3 text-gray-500 italic">Promedio del área (referencia)</td>
                  <td className="px-4 py-3 text-gray-400">—</td>
                  <td className="px-4 py-3 text-right">{areaAvg.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-gray-400">—</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                      Referencia
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination
              currentPage={compPage}
              totalItems={totalTecnicoRows}
              pageSize={compPageSize}
              onPageChange={setCompPage}
              onPageSizeChange={setCompPageSize}
            />
          </div>
        </div>
      )}

      {/* ── F12.3 — Alerts (tecnico + jefe) ── */}
      {(role === 'tecnico' || role === 'jefe') && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Alertas de EPP — F12.3</h2>
            <p className="text-sm text-gray-500 mt-1">
              Reposiciones anticipadas y consumos excesivos detectados automáticamente.
            </p>
          </div>
          <div className="p-5 space-y-3">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <span className="text-emerald-700 font-medium">Sin alertas de EPP</span>
              </div>
            ) : (
              alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 rounded-lg p-4 border ${
                    alert.severity === 'Alta'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <AlertTriangle
                    className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                      alert.severity === 'Alta' ? 'text-red-500' : 'text-amber-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">
                        {alert.type === 'early' ? 'Reposición Anticipada' : 'Consumo Excesivo'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${severityBadge(alert.severity)}`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">
                      <span className="font-medium">{alert.tecnico}</span>
                      {alert.item ? ` — ${alert.item}` : ''}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{alert.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Info footer ── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-500 space-y-1">
        <p><span className="font-semibold text-gray-700">Técnico:</span> puede registrar nuevas entregas de EPP y consultar el historial y alertas.</p>
        <p><span className="font-semibold text-gray-700">Jefe:</span> accede además a la comparativa de consumo por técnico (F12.2) para análisis de desviaciones.</p>
        <p><span className="font-semibold text-gray-700">Personal:</span> no tiene acceso a esta sección.</p>
      </div>

      {/* ── F12.1 Modal ── */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <HardHat className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Nueva Entrega EPP — F12.1</h3>
              </div>
              <button
                onClick={() => { setShowFormModal(false); resetForm(); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4">
              {/* Técnico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Técnico <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.tecnico}
                  onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    formErrors.tecnico ? 'border-red-400' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar técnico...</option>
                  {tecnicosList.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {formErrors.tecnico && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.tecnico}</p>
                )}
              </div>

              {/* Área */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.area}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    formErrors.area ? 'border-red-400' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar área...</option>
                  {areasList.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                {formErrors.area && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.area}</p>
                )}
              </div>

              {/* Ítem EPP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ítem EPP <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.item}
                  onChange={e => setForm(f => ({ ...f, item: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    formErrors.item ? 'border-red-400' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar ítem EPP...</option>
                  {itemsEPP.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                {formErrors.item && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.item}</p>
                )}
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.categoria}
                  onChange={e => setForm(f => ({ ...f, categoria: e.target.value as CategoriaEPP | '' }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    formErrors.categoria ? 'border-red-400' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar categoría...</option>
                  {categoriasEPP.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {formErrors.categoria && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.categoria}</p>
                )}
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.cantidad}
                  onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
                  placeholder="Ej: 2"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    formErrors.cantidad ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {formErrors.cantidad && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.cantidad}</p>
                )}
              </div>

              {/* Fecha Entrega */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Entrega <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.fechaEntrega}
                  onChange={e => setForm(f => ({ ...f, fechaEntrega: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    formErrors.fechaEntrega ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {formErrors.fechaEntrega && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.fechaEntrega}</p>
                )}
              </div>

              {/* Fecha Reposición Programada */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Reposición Programada <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.fechaReposicionProgramada}
                  onChange={e => setForm(f => ({ ...f, fechaReposicionProgramada: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    formErrors.fechaReposicionProgramada ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {formErrors.fechaReposicionProgramada && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.fechaReposicionProgramada}</p>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => { setShowFormModal(false); resetForm(); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Guardando...' : 'Guardar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
