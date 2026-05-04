import { useState, useEffect, useMemo } from 'react';
import { HardHat, Plus, X, AlertTriangle, CheckCircle, Users, Package, Loader2, DollarSign, Calendar } from 'lucide-react';
import { useRole } from '@shared/context/AssetContext';
import { useAuth } from '@shared/context/AuthContext';
import { Pagination } from '@shared/components';
import { usePagination } from '@shared/hooks/usePagination';
import {
  getEntregasEPP,
  createEntregaEPP,
  getCatalogoEPP,
} from '../../services/consumablesService';
import type { EntregaEPP, CatalogoEPP, RegistrarEntregaPayload } from '../../services/consumablesService';
import { getUsuariosAsignables } from '../../services/usuariosService';
import { getAreas, AreaAPI } from '../../services/assetService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysUntil(iso: string) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface HBarProps { data: { label: string; total: number; color?: string }[]; baseColor?: string }

function HorizontalBar({ data, baseColor = 'bg-amber-500' }: HBarProps) {
  const max = Math.max(...data.map(d => d.total), 1);
  if (data.length === 0) return <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>;
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-36 text-xs text-gray-600 truncate shrink-0 text-right">{d.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full ${d.color ?? baseColor} rounded-full flex items-center justify-end pr-2 transition-all`}
              style={{ width: `${Math.max((d.total / max) * 100, 4)}%` }}
            >
              <span className="text-[10px] font-bold text-white whitespace-nowrap">{d.total}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function tipoBadgeClass(tipo: string) {
  const map: Record<string, string> = {
    'guantes-nitrilo': 'bg-blue-100 text-blue-700',
    'guantes-cuero': 'bg-blue-100 text-blue-700',
    'mascarilla-n95': 'bg-pink-100 text-pink-700',
    'mascarilla-quirurgica': 'bg-pink-100 text-pink-700',
    'gafas-seguridad': 'bg-purple-100 text-purple-700',
    'lentes-seguridad': 'bg-purple-100 text-purple-700',
    'careta-facial': 'bg-purple-100 text-purple-700',
    'calzado-punta-acero': 'bg-yellow-100 text-yellow-700',
    'botas-seguridad': 'bg-yellow-100 text-yellow-700',
    'botas-goma': 'bg-yellow-100 text-yellow-700',
    'overol': 'bg-indigo-100 text-indigo-700',
    'chaleco-reflectante': 'bg-indigo-100 text-indigo-700',
    'casco': 'bg-orange-100 text-orange-700',
    'proteccion-auditiva': 'bg-teal-100 text-teal-700',
    'arnes-seguridad': 'bg-red-100 text-red-700',
  };
  return map[tipo] ?? 'bg-gray-100 text-gray-700';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PPEManagement() {
  const role = useRole();
  const { user } = useAuth();

  const [entregas, setEntregas] = useState<EntregaEPP[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoEPP[]>([]);
  const [tecnicosList, setTecnicosList] = useState<{ id: string; nombre: string; area: string; rol: string }[]>([]);
  const [areasList, setAreasList] = useState<AreaAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canAdd = role === 'tecnico' || role === 'jefe';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.allSettled([
      getEntregasEPP(),
      getCatalogoEPP(),
      getUsuariosAsignables(),
      getAreas(),
    ]).then(([rE, rC, rU, rA]) => {
      if (cancelled) return;
      if (rE.status === 'fulfilled') setEntregas(rE.value);
      else setLoadError('No se pudieron cargar las entregas. Verifique la conexión.');
      if (rC.status === 'fulfilled') setCatalogo(rC.value);
      if (rU.status === 'fulfilled') {
        setTecnicosList(
          rU.value.map((u: any) => ({
            id: u.id ?? u.nombre,
            nombre: u.nombre,
            area: u.area ?? '',
            rol: u.rol ?? '',
          })),
        );
      }
      if (rA.status === 'fulfilled') setAreasList(rA.value);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Lookups ──────────────────────────────────────────────────────────────────
  const catalogoMap = useMemo(() => Object.fromEntries(catalogo.map(c => [c.id, c])), [catalogo]);
  const areaMap = useMemo(() => Object.fromEntries(areasList.map(a => [a.id, a.nombre])), [areasList]);

  // ── Filter & pagination ───────────────────────────────────────────────────────
  const [filterTecnico, setFilterTecnico] = useState('Todos');
  const uniqueTecnicos = useMemo(
    () => Array.from(new Set(entregas.map(e => e.tecnicoNombre))).sort(),
    [entregas],
  );
  const filteredEntregas = useMemo(
    () => filterTecnico === 'Todos' ? entregas : entregas.filter(e => e.tecnicoNombre === filterTecnico),
    [entregas, filterTecnico],
  );
  const { paginatedItems, currentPage, pageSize, setCurrentPage, setPageSize, totalItems } =
    usePagination(filteredEntregas, 10);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalCosto = useMemo(
    () => entregas.reduce((s, e) => s + (catalogoMap[e.eppId]?.costoUnitario ?? 0) * e.cantidad, 0),
    [entregas, catalogoMap],
  );

  // ── Próximas reposiciones (next 30 days) ──────────────────────────────────
  const proximasReposiciones = useMemo(() => {
    return entregas
      .filter(e => {
        const days = daysUntil(e.proximaReposicion);
        return days !== null && days >= 0 && days <= 30;
      })
      .sort((a, b) => new Date(a.proximaReposicion).getTime() - new Date(b.proximaReposicion).getTime())
      .slice(0, 10);
  }, [entregas]);

  // ── Dashboard data ─────────────────────────────────────────────────────────
  const byTipoEPP = useMemo(() => {
    const groups: Record<string, number> = {};
    entregas.forEach(e => {
      groups[e.eppTipo] = (groups[e.eppTipo] ?? 0) + e.cantidad;
    });
    return Object.entries(groups)
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total);
  }, [entregas]);

  const byTecnicoCosto = useMemo(() => {
    const groups: Record<string, number> = {};
    entregas.forEach(e => {
      const costo = (catalogoMap[e.eppId]?.costoUnitario ?? 0) * e.cantidad;
      groups[e.tecnicoNombre] = (groups[e.tecnicoNombre] ?? 0) + costo;
    });
    return Object.entries(groups)
      .map(([label, total]) => ({ label, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [entregas, catalogoMap]);

  // ── Comparative table ─────────────────────────────────────────────────────
  const comparativaRows = useMemo(() => {
    const byTecnico: Record<string, { total: number; areaId: string }> = {};
    entregas.forEach(e => {
      if (!byTecnico[e.tecnicoNombre]) byTecnico[e.tecnicoNombre] = { total: 0, areaId: e.areaId };
      byTecnico[e.tecnicoNombre].total += e.cantidad;
    });
    const totals = Object.values(byTecnico).map(t => t.total);
    const mean = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    return Object.entries(byTecnico)
      .map(([nombre, data]) => {
        const desv = mean > 0 ? ((data.total - mean) / mean) * 100 : 0;
        const badge = desv > 30 ? 'Crítico' : desv > 15 ? 'Elevado' : 'Normal';
        return { nombre, areaId: data.areaId, total: data.total, desv, badge };
      })
      .sort((a, b) => b.desv - a.desv);
  }, [entregas]);

  const compMean = comparativaRows.length > 0
    ? comparativaRows.reduce((s, r) => s + r.total, 0) / comparativaRows.length
    : 0;

  const { paginatedItems: compPage, currentPage: compCurr, pageSize: compSize,
    setCurrentPage: setCompCurr, setPageSize: setCompSize, totalItems: compTotal } =
    usePagination(comparativaRows, 10);

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const items: { type: 'early' | 'excess'; tecnico: string; item?: string; description: string; severity: 'Media' | 'Alta' }[] = [];
    entregas.forEach(e => {
      if (e.esExtraordinaria) {
        items.push({
          type: 'early', tecnico: e.tecnicoNombre, item: e.eppNombre,
          description: `Entrega extraordinaria de "${e.eppNombre}"${e.motivoExtraordinaria ? ': ' + e.motivoExtraordinaria : '.'}`,
          severity: 'Media',
        });
      }
    });
    const mean = compMean;
    comparativaRows.forEach(r => {
      if (r.total > mean * 1.5) {
        items.push({ type: 'excess', tecnico: r.nombre, description: `Consumo de ${r.total} unidades — supera en más del 50% el promedio (${mean.toFixed(1)}).`, severity: 'Alta' });
      } else if (r.total > mean * 1.3) {
        items.push({ type: 'excess', tecnico: r.nombre, description: `Consumo de ${r.total} unidades — supera entre 30–50% el promedio (${mean.toFixed(1)}).`, severity: 'Media' });
      }
    });
    return items;
  }, [entregas, comparativaRows, compMean]);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    eppId: '', tecnicoId: '', areaId: '', cantidad: '',
    loteProveedor: '', esExtraordinaria: false, motivoExtraordinaria: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const selectedEPP = catalogo.find(c => c.id === form.eppId) ?? null;
  const selectedTecnico = tecnicosList.find(t => t.id === form.tecnicoId) ?? null;
  const costoPreview = selectedEPP && form.cantidad ? selectedEPP.costoUnitario * Number(form.cantidad) : null;

  function resetForm() {
    setForm({ eppId: '', tecnicoId: '', areaId: '', cantidad: '', loteProveedor: '', esExtraordinaria: false, motivoExtraordinaria: '' });
    setFormErrors({});
    setSaveError('');
  }

  function validateForm() {
    const errors: Record<string, string> = {};
    if (!form.eppId) errors.eppId = 'Seleccione un ítem EPP del catálogo';
    if (!form.tecnicoId) errors.tecnicoId = 'Seleccione un técnico';
    if (!form.areaId) errors.areaId = 'Seleccione un área';
    if (!form.cantidad || Number(form.cantidad) <= 0) errors.cantidad = 'Ingrese una cantidad mayor a 0';
    if (form.esExtraordinaria && !form.motivoExtraordinaria.trim())
      errors.motivoExtraordinaria = 'Indique el motivo de la entrega extraordinaria';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm() || !selectedTecnico || !user) return;
    setSaveError('');
    const payload: RegistrarEntregaPayload = {
      eppId: form.eppId,
      tecnicoId: selectedTecnico.id,
      tecnicoNombre: selectedTecnico.nombre,
      areaId: form.areaId,
      cantidad: Number(form.cantidad),
      ...(form.loteProveedor.trim() && { loteProveedor: form.loteProveedor.trim() }),
      esExtraordinaria: form.esExtraordinaria,
      ...(form.esExtraordinaria && form.motivoExtraordinaria.trim() && { motivoExtraordinaria: form.motivoExtraordinaria.trim() }),
      entregadoPor: user.uid,
      entregadoPorNombre: user.nombre,
    };
    setSaving(true);
    try {
      const created = await createEntregaEPP(payload);
      setEntregas(prev => [created, ...prev]);
      setShowModal(false);
      resetForm();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo registrar la entrega');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        <p className="text-sm text-gray-500">Cargando gestión de EPP...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl">
            <HardHat className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de EPP</h1>
            <p className="text-sm text-gray-500">Equipos de Protección Personal — guantes, gafas, calzado, overol, mascarilla</p>
          </div>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva Entrega EPP
          </button>
        )}
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" /> {loadError}
        </div>
      )}

      {catalogo.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Catálogo de EPP vacío.</strong> Agregue ítems en <a href="/epp-catalogo" className="underline font-medium">Catálogo de EPP</a> antes de registrar entregas.
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-amber-50 rounded-lg"><Package className="h-5 w-5 text-amber-600" /></div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Entregas</p>
            <p className="text-xl font-bold text-gray-900">{entregas.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-blue-50 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Técnicos</p>
            <p className="text-xl font-bold text-gray-900">{uniqueTecnicos.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-emerald-50 rounded-lg"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Costo Total</p>
            <p className="text-xl font-bold text-gray-900">${fmt(totalCosto)}</p>
          </div>
        </div>
        <div className={`bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm ${alerts.length > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
          <div className={`p-2 rounded-lg ${alerts.length > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
            <AlertTriangle className={`h-5 w-5 ${alerts.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Alertas</p>
            <p className={`text-xl font-bold ${alerts.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{alerts.length}</p>
          </div>
        </div>
      </div>

      {/* ── Dashboard (jefe only) ── */}
      {role === 'jefe' && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Análisis de Consumo EPP</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Entregas por tipo */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">Unidades Entregadas por Tipo de EPP</p>
              <HorizontalBar data={byTipoEPP} baseColor="bg-amber-500" />
            </div>

            {/* Costo por técnico */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-4">Costo EPP por Técnico ($)</p>
              <div className="space-y-2">
                {byTecnicoCosto.map(d => {
                  const max = Math.max(...byTecnicoCosto.map(x => x.total), 1);
                  return (
                    <div key={d.label} className="flex items-center gap-3">
                      <span className="w-36 text-xs text-gray-600 truncate shrink-0 text-right">{d.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${Math.max((d.total / max) * 100, 4)}%` }}
                        >
                          <span className="text-[10px] font-bold text-white whitespace-nowrap">${fmt(d.total)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {byTecnicoCosto.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>}
              </div>
            </div>
          </div>

          {/* Comparativa por técnico */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">Comparativa por Técnico</h3>
              <p className="text-sm text-gray-500 mt-0.5">Desviación respecto al promedio del grupo ({compMean.toFixed(1)} unidades)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Técnico</th>
                    <th className="px-4 py-3 text-left">Área</th>
                    <th className="px-4 py-3 text-right">Unidades</th>
                    <th className="px-4 py-3 text-right">Desviación</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {compPage.map(row => (
                    <tr key={row.nombre} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{row.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">{areaMap[row.areaId] ?? row.areaId}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{row.total}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{row.desv >= 0 ? '+' : ''}{row.desv.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          row.badge === 'Crítico' ? 'bg-red-100 text-red-700' :
                          row.badge === 'Elevado' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>{row.badge}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td className="px-4 py-3 text-gray-500 italic text-sm">Promedio del grupo (referencia)</td>
                    <td className="px-4 py-3 text-gray-400">—</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700">{compMean.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">—</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Referencia</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <Pagination currentPage={compCurr} totalItems={compTotal} pageSize={compSize} onPageChange={setCompCurr} onPageSizeChange={setCompSize} />
            </div>
          </div>
        </section>
      )}

      {/* ── Próximas Reposiciones ── */}
      {proximasReposiciones.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">
              Próximas Reposiciones (30 días) — {proximasReposiciones.length} ítem{proximasReposiciones.length !== 1 ? 's' : ''}
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {proximasReposiciones.map(e => {
              const days = daysUntil(e.proximaReposicion)!;
              return (
                <div key={e.id} className="px-5 py-3 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-xs font-bold shrink-0 ${
                    days <= 3 ? 'bg-red-100 text-red-700' : days <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    <span className="text-lg leading-none">{days}</span>
                    <span>días</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{e.tecnicoNombre}</p>
                    <p className="text-xs text-gray-500">{e.eppNombre} · {fmtDate(e.proximaReposicion)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoBadgeClass(e.eppTipo)}`}>{e.eppTipo}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Historial de Entregas ── */}
      {(role === 'tecnico' || role === 'jefe') && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-base font-semibold text-gray-800">
              Historial de Entregas <span className="text-gray-400 font-normal text-sm">({entregas.length} total)</span>
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Filtrar:</label>
              <select
                value={filterTecnico}
                onChange={e => setFilterTecnico(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Todos">Todos</option>
                {uniqueTecnicos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Técnico</th>
                  <th className="px-4 py-3 text-left">Área</th>
                  <th className="px-4 py-3 text-left">Ítem EPP</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-right">Cant.</th>
                  <th className="px-4 py-3 text-right">Costo</th>
                  <th className="px-4 py-3 text-left">Entrega</th>
                  <th className="px-4 py-3 text-left">Próx. Repos.</th>
                  <th className="px-4 py-3 text-left">Entregado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedItems.map(e => {
                  const costo = (catalogoMap[e.eppId]?.costoUnitario ?? 0) * e.cantidad;
                  const days = daysUntil(e.proximaReposicion);
                  return (
                    <tr key={e.id} className={`hover:bg-gray-50 transition-colors ${e.esExtraordinaria ? 'border-l-4 border-l-orange-400' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-800">{e.tecnicoNombre}</td>
                      <td className="px-4 py-3 text-gray-600">{areaMap[e.areaId] ?? e.areaId}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {e.eppNombre}
                        {e.esExtraordinaria && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700">Extraord.</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoBadgeClass(e.eppTipo)}`}>{e.eppTipo}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{e.cantidad}</td>
                      <td className="px-4 py-3 text-right text-gray-700">${fmt(costo)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(e.fechaEntrega)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-medium ${days !== null && days <= 7 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          {fmtDate(e.proximaReposicion)}
                          {days !== null && days >= 0 && days <= 7 && <span className="ml-1 text-[10px]">({days}d)</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.entregadoPorNombre}</td>
                    </tr>
                  );
                })}
                {filteredEntregas.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-400">No hay entregas registradas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
          </div>
        </div>
      )}

      {/* ── Alertas ── */}
      {(role === 'tecnico' || role === 'jefe') && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Alertas de EPP</h2>
            <p className="text-xs text-gray-500 mt-0.5">Entregas extraordinarias y consumos que superan el promedio del grupo.</p>
          </div>
          <div className="p-5 space-y-3">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="text-emerald-700 font-medium text-sm">Sin alertas activas</span>
              </div>
            ) : (
              alerts.map((alert, idx) => (
                <div key={idx} className={`flex items-start gap-3 rounded-lg p-4 border ${alert.severity === 'Alta' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${alert.severity === 'Alta' ? 'text-red-500' : 'text-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm">
                        {alert.type === 'early' ? 'Entrega Extraordinaria' : 'Consumo Excesivo'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${alert.severity === 'Alta' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{alert.tecnico}{alert.item ? ` — ${alert.item}` : ''}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Modal Nueva Entrega ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg"><HardHat className="h-5 w-5 text-amber-600" /></div>
                <h3 className="text-lg font-semibold text-gray-900">Nueva Entrega EPP</h3>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{saveError}</div>
              )}

              {/* EPP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ítem EPP <span className="text-red-500">*</span></label>
                <select
                  value={form.eppId}
                  onChange={e => setForm(f => ({ ...f, eppId: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${formErrors.eppId ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Seleccionar ítem del catálogo…</option>
                  {catalogo.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} — {c.tipo}</option>
                  ))}
                </select>
                {formErrors.eppId && <p className="text-xs text-red-500 mt-1">{formErrors.eppId}</p>}
                {selectedEPP && (
                  <p className="text-xs text-gray-400 mt-1">
                    Reposición c/{selectedEPP.frecuenciaReposicionDias} días · ${fmt(selectedEPP.costoUnitario)}/u
                    {selectedEPP.stockActual !== undefined && ` · Stock: ${selectedEPP.stockActual}`}
                  </p>
                )}
              </div>

              {/* Técnico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Técnico receptor <span className="text-red-500">*</span></label>
                <select
                  value={form.tecnicoId}
                  onChange={e => {
                    const t = tecnicosList.find(u => u.id === e.target.value);
                    setForm(f => ({ ...f, tecnicoId: e.target.value, areaId: t?.area ?? f.areaId }));
                  }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${formErrors.tecnicoId ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Seleccionar usuario…</option>
                  {tecnicosList.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre} — {t.rol}</option>
                  ))}
                </select>
                {formErrors.tecnicoId && <p className="text-xs text-red-500 mt-1">{formErrors.tecnicoId}</p>}
              </div>

              {/* Área */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Área <span className="text-red-500">*</span></label>
                <select
                  value={form.areaId}
                  onChange={e => setForm(f => ({ ...f, areaId: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${formErrors.areaId ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Seleccionar área…</option>
                  {areasList.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
                {formErrors.areaId && <p className="text-xs text-red-500 mt-1">{formErrors.areaId}</p>}
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  value={form.cantidad}
                  onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
                  placeholder="Ej: 2"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${formErrors.cantidad ? 'border-red-400' : 'border-gray-300'}`}
                />
                {formErrors.cantidad && <p className="text-xs text-red-500 mt-1">{formErrors.cantidad}</p>}
                {costoPreview !== null && (
                  <p className="text-xs text-gray-400 mt-1">Costo estimado: <strong>${fmt(costoPreview)}</strong></p>
                )}
              </div>

              {/* Lote (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lote Proveedor <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={form.loteProveedor}
                  onChange={e => setForm(f => ({ ...f, loteProveedor: e.target.value }))}
                  placeholder="Ej: LOT-2025-001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Extraordinaria */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.esExtraordinaria}
                    onChange={e => setForm(f => ({ ...f, esExtraordinaria: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Entrega extraordinaria (fuera del ciclo normal)</span>
                </label>
              </div>
              {form.esExtraordinaria && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo <span className="text-red-500">*</span></label>
                  <textarea
                    value={form.motivoExtraordinaria}
                    onChange={e => setForm(f => ({ ...f, motivoExtraordinaria: e.target.value }))}
                    placeholder="Pérdida, accidente, desgaste acelerado…"
                    rows={2}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none ${formErrors.motivoExtraordinaria ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {formErrors.motivoExtraordinaria && <p className="text-xs text-red-500 mt-1">{formErrors.motivoExtraordinaria}</p>}
                </div>
              )}
              <p className="text-xs text-gray-400">La fecha de entrega y la próxima reposición se calculan automáticamente.</p>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar Entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
