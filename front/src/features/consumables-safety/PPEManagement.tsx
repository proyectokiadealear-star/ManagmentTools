import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HardHat, Plus, X, AlertTriangle, CheckCircle, Users, Package, Loader2 } from 'lucide-react';
import { useRole } from '@shared/context/AssetContext';
import { useAuth } from '@shared/context/AuthContext';
import { computeStats } from '@shared/utils/stats';
import { ModalShell, Pagination } from '@shared/components';
import { usePagination } from '@shared/hooks/usePagination';
import {
  getEntregasEPP,
  createEntregaEPP,
  getCatalogoEPP,
} from '../../services/consumablesService';
import type { EntregaEPP, CatalogoEPP, RegistrarEntregaPayload } from '../../services/consumablesService';
import { getUsuariosAsignables } from '../../services/usuariosService';
import { getAreas } from '../../services/assetService';

type AlertItem = {
  type: 'early' | 'excess';
  tecnico: string;
  item?: string;
  description: string;
  severity: 'Media' | 'Alta';
};

type Usuario = { id: string; nombre: string; area: string; rol: string };
type Area = { id: string; nombre: string };

export function PPEManagement() {
  const role = useRole();
  const { user } = useAuth();
  const [entregas, setEntregas] = useState<EntregaEPP[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoEPP[]>([]);
  const [tecnicosList, setTecnicosList] = useState<Usuario[]>([]);
  const [areasList, setAreasList] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getEntregasEPP(),
      getCatalogoEPP().catch(() => [] as CatalogoEPP[]),
      getUsuariosAsignables().catch(() => []),
      getAreas().catch(() => []),
    ]).then(([data, cat, usuarios, areas]) => {
      if (!cancelled) {
        setEntregas(data);
        setCatalogo(cat);
        setTecnicosList(
          usuarios.map((u: { id?: string; nombre: string; area?: string; rol?: string }) => ({
            id: u.id ?? u.nombre,
            nombre: u.nombre,
            area: u.area ?? '',
            rol: u.rol ?? 'no_elegible',
          })),
        );
        setAreasList(areas.map((a: { id?: string; nombre: string }) => ({ id: a.id ?? a.nombre, nombre: a.nombre })));
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // catalog lookup map: eppId → CatalogoEPP
  const catalogoMap = Object.fromEntries(catalogo.map(c => [c.id, c]));

  const [filterTecnico, setFilterTecnico] = useState<string>('Todos');
  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState({
    eppId: '',
    tecnicoId: '',
    areaId: '',
    cantidad: '',
    loteProveedor: '',
    esExtraordinaria: false,
    motivoExtraordinaria: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Derived: selected EPP item from catalog
  const selectedEPP = catalogo.find(c => c.id === form.eppId) ?? null;
  const selectedTecnico = tecnicosList.find(t => t.id === form.tecnicoId) ?? null;

  // ─── Unique technician names from entregas for filter ────────────────────
  const uniqueTecnicos = Array.from(new Set(entregas.map(e => e.tecnicoNombre))).sort();

  // ─── Filtered table rows ──────────────────────────────────────────────────
  const filteredEntregas =
    filterTecnico === 'Todos'
      ? entregas
      : entregas.filter(e => e.tecnicoNombre === filterTecnico);

  const {
    paginatedItems: pageEntregas,
    currentPage: entregasPage, pageSize: entregasPageSize,
    setCurrentPage: setEntregasPage, setPageSize: setEntregasPageSize,
    totalItems: totalEntregas,
  } = usePagination(filteredEntregas, 10);

  // ─── F12.2 — Per-technician totals ────────────────────────────────────────
  const totalByTecnico: Record<string, { total: number; areaId: string }> = {};
  for (const e of entregas) {
    if (!totalByTecnico[e.tecnicoNombre]) {
      totalByTecnico[e.tecnicoNombre] = { total: 0, areaId: e.areaId };
    }
    totalByTecnico[e.tecnicoNombre].total += e.cantidad;
  }

  const tecnicoTotals = Object.entries(totalByTecnico).map(([name, data]) => ({
    name,
    areaId: data.areaId,
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

  // Alert type 1 — Extraordinary deliveries (backend flags esExtraordinaria)
  for (const e of entregas) {
    if (e.esExtraordinaria) {
      alerts.push({
        type: 'early',
        tecnico: e.tecnicoNombre,
        item: e.eppNombre,
        description: `Entrega extraordinaria de "${e.eppNombre}"${e.motivoExtraordinaria ? ': ' + e.motivoExtraordinaria : '. Se entregó fuera del ciclo normal.'}`,
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
      eppId: '',
      tecnicoId: '',
      areaId: '',
      cantidad: '',
      loteProveedor: '',
      esExtraordinaria: false,
      motivoExtraordinaria: '',
    });
    setFormErrors({});
  }

  function handleCloseModal() {
    setShowFormModal(false);
    resetForm();
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!form.eppId) errors.eppId = 'Seleccione un ítem EPP del catálogo';
    if (!form.tecnicoId) errors.tecnicoId = 'Seleccione un técnico';
    if (!form.areaId) errors.areaId = 'Seleccione un área';
    if (!form.cantidad || Number(form.cantidad) <= 0)
      errors.cantidad = 'Ingrese una cantidad mayor a 0';
    if (form.esExtraordinaria && !form.motivoExtraordinaria.trim())
      errors.motivoExtraordinaria = 'Indique el motivo de la entrega extraordinaria';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    if (!selectedTecnico) return;
    if (!user) return;

    const payload: RegistrarEntregaPayload = {
      eppId: form.eppId,
      tecnicoId: selectedTecnico.id,
      tecnicoNombre: selectedTecnico.nombre,
      areaId: form.areaId,
      cantidad: Number(form.cantidad),
      ...(form.loteProveedor.trim() && { loteProveedor: form.loteProveedor.trim() }),
      esExtraordinaria: form.esExtraordinaria,
      ...(form.esExtraordinaria && form.motivoExtraordinaria.trim() && {
        motivoExtraordinaria: form.motivoExtraordinaria.trim(),
      }),
      entregadoPor: user.uid,
      entregadoPorNombre: user.nombre,
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

  function isExtraordinaryRow(e: EntregaEPP): boolean {
    return e.esExtraordinaria;
  }

  // ─── Badge helpers ────────────────────────────────────────────────────────
  function tipoBadge(tipo: string) {
    const map: Record<string, string> = {
      'guantes-nitrilo': 'bg-blue-100 text-blue-700',
      'guantes-cuero': 'bg-blue-100 text-blue-700',
      'mascarilla-n95': 'bg-pink-100 text-pink-700',
      'mascarilla-quirurgica': 'bg-pink-100 text-pink-700',
      'lentes-seguridad': 'bg-purple-100 text-purple-700',
      'careta-facial': 'bg-purple-100 text-purple-700',
      'calzado-punta-acero': 'bg-yellow-100 text-yellow-700',
      'botas-goma': 'bg-yellow-100 text-yellow-700',
      'overol': 'bg-indigo-100 text-indigo-700',
      'chaleco-reflectante': 'bg-indigo-100 text-indigo-700',
      'casco': 'bg-orange-100 text-orange-700',
      'proteccion-auditiva': 'bg-teal-100 text-teal-700',
      'arnes-seguridad': 'bg-red-100 text-red-700',
    };
    return map[tipo] ?? 'bg-gray-100 text-gray-700';
  }

  function desvBadge(badge: 'Normal' | 'Elevado' | 'Crítico') {
    if (badge === 'Normal') return 'bg-emerald-100 text-emerald-700';
    if (badge === 'Elevado') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  }

  function severityBadge(s: 'Media' | 'Alta') {
    return s === 'Alta' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
  }

  function formatDate(iso: string) {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

      {!loading && (
        <>
          {/* ── Header ── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <HardHat className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de EPP — C12</h1>
                <p className="text-sm text-gray-500">
                  Equipos de Protección Personal: vestimenta y dispositivos de seguridad para proteger al trabajador
                  (guantes, gafas, calzado, overol, mascarilla, protección auditiva)
                </p>
              </div>
            </div>
            {role === 'tecnico' && (
              <button
                onClick={() => setShowFormModal(true)}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-[transform,background-color] duration-150 ease-out active:scale-[0.97]"
              >
                <Plus className="h-4 w-4" />
                Nueva Entrega EPP (F12.1)
              </button>
            )}
          </div>

          {/* ── Empty catalog warning ── */}
          {catalogo.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <strong>Catálogo de EPP vacío.</strong> Antes de registrar entregas, agrega ítems en{' '}
              <a href="/epp-catalogo" className="underline font-medium">Catálogo de EPP</a>.
            </div>
          )}

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
            >
              <div className="p-3 bg-amber-50 rounded-lg">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpiTotalEntregas}</p>
                <p className="text-sm text-gray-500">Total Entregas Registradas</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: 0.06 }}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
            >
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpiAlertasActivas}</p>
                <p className="text-sm text-gray-500">Alertas Activas</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: 0.12 }}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
            >
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpiTecnicosMonitoreados}</p>
                <p className="text-sm text-gray-500">Técnicos Monitoreados</p>
              </div>
            </motion.div>
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
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-right">Cant.</th>
                      <th className="px-4 py-3 text-right">Costo Total</th>
                      <th className="px-4 py-3 text-left">Fecha Entrega</th>
                      <th className="px-4 py-3 text-left">Próxima Reposición</th>
                      <th className="px-4 py-3 text-left">Entregado Por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageEntregas.map(e => {
                      const costoUnit = catalogoMap[e.eppId]?.costoUnitario;
                      const costoTotal = costoUnit !== undefined ? costoUnit * e.cantidad : null;
                      return (
                        <tr
                          key={e.id}
                          className={`hover:bg-gray-50 transition-colors ${isExtraordinaryRow(e) ? 'border-l-4 border-l-orange-400' : ''}`}
                        >
                          <td className="px-4 py-3 font-medium text-gray-800">{e.tecnicoNombre}</td>
                          <td className="px-4 py-3 text-gray-600">{e.areaId}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {e.eppNombre}
                            {e.esExtraordinaria && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">
                                Extraordinaria
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoBadge(e.eppTipo)}`}>
                              {e.eppTipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{e.cantidad}</td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {costoTotal !== null ? `$${costoTotal.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(e.fechaEntrega)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(e.proximaReposicion)}</td>
                          <td className="px-4 py-3 text-gray-600">{e.entregadoPorNombre}</td>
                        </tr>
                      );
                    })}
                    {filteredEntregas.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
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
                        <td className="px-4 py-3 text-gray-600">{row.areaId}</td>
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
                  Entregas extraordinarias y consumos excesivos detectados automáticamente.
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
                            {alert.type === 'early' ? 'Entrega Extraordinaria' : 'Consumo Excesivo'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${severityBadge(alert.severity)}`}>
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
          <ModalShell isOpen={showFormModal} onClose={handleCloseModal} maxHeight="max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <HardHat className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Nueva Entrega EPP — F12.1</h3>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-[transform,background-color] duration-150 ease-out active:scale-[0.97]"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Modal body */}
                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                  {/* Ítem EPP */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ítem EPP <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.eppId}
                      onChange={e => setForm(f => ({ ...f, eppId: e.target.value }))}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        formErrors.eppId ? 'border-red-400' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Seleccionar ítem del catálogo...</option>
                      {catalogo.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} — {c.tipo}
                        </option>
                      ))}
                    </select>
                    {formErrors.eppId && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.eppId}</p>
                    )}
                    {selectedEPP && (
                      <p className="text-xs text-gray-400 mt-1">
                        Reposición cada {selectedEPP.frecuenciaReposicionDias} días · Costo: ${selectedEPP.costoUnitario.toFixed(2)}/u
                        {selectedEPP.stockActual !== undefined && ` · Stock: ${selectedEPP.stockActual}`}
                      </p>
                    )}
                    {catalogo.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        No hay ítems en el catálogo. Agrégalos en{' '}
                        <a href="/epp-catalogo" className="underline">Catálogo de EPP</a>.
                      </p>
                    )}
                  </div>

                  {/* Técnico */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Técnico <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.tecnicoId}
                      onChange={e => setForm(f => ({ ...f, tecnicoId: e.target.value }))}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        formErrors.tecnicoId ? 'border-red-400' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Seleccionar usuario elegible...</option>
                      {tecnicosList.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre} — {t.rol}</option>
                      ))}
                    </select>
                    {formErrors.tecnicoId && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.tecnicoId}</p>
                    )}
                    {selectedTecnico && (
                      <p className="text-xs text-gray-400 mt-1">
                        Área del receptor: {selectedTecnico.area}
                      </p>
                    )}
                  </div>

                  {/* Área */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Área <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.areaId}
                      onChange={e => setForm(f => ({ ...f, areaId: e.target.value }))}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        formErrors.areaId ? 'border-red-400' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Seleccionar área...</option>
                      {areasList.map(a => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </select>
                    {formErrors.areaId && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.areaId}</p>
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
                    {selectedEPP && form.cantidad && Number(form.cantidad) > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Costo estimado: ${(selectedEPP.costoUnitario * Number(form.cantidad)).toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Lote proveedor (opcional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lote Proveedor <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.loteProveedor}
                      onChange={e => setForm(f => ({ ...f, loteProveedor: e.target.value }))}
                      placeholder="Ej: LOT-2024-001"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Entrega extraordinaria */}
                  <div className="flex items-center gap-2">
                    <input
                      id="esExtraordinaria"
                      type="checkbox"
                      checked={form.esExtraordinaria}
                      onChange={e => setForm(f => ({ ...f, esExtraordinaria: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <label htmlFor="esExtraordinaria" className="text-sm font-medium text-gray-700">
                      Entrega extraordinaria (fuera del ciclo normal)
                    </label>
                  </div>

                  {/* Motivo extraordinaria */}
                  {form.esExtraordinaria && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Motivo de la entrega extraordinaria <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={form.motivoExtraordinaria}
                        onChange={e => setForm(f => ({ ...f, motivoExtraordinaria: e.target.value }))}
                        placeholder="Ej: Pérdida del EPP, accidente, desgaste acelerado…"
                        rows={2}
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none ${
                          formErrors.motivoExtraordinaria ? 'border-red-400' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.motivoExtraordinaria && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.motivoExtraordinaria}</p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    La fecha de entrega y la próxima reposición son calculadas automáticamente por el sistema.
                  </p>
                </div>

                {/* Modal footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-[transform,background-color] duration-150 ease-out active:scale-[0.97]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] disabled:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Registrar Entrega
                  </button>
                </div>
            </ModalShell>
          </>
        )}
      </div>
    );
  }
