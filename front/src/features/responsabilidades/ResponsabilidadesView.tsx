import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  History,
  RefreshCw,
  UserMinus,
  UserCheck,
  UserX,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  PeriodoResponsabilidad,
  PersonalTaller,
  PERMISO_LABELS,
  PermisoResponsabilidad,
} from '../../data/mockData';
import { getActivos, getPersonal, cerrarPeriodo } from '../../services/responsabilidadService';
import { AsignarResponsableModal } from './AsignarResponsableModal';
import { HistorialResponsabilidadModal } from './HistorialResponsabilidadModal';
import { ConfirmModal } from '@shared/components';

interface ToastMsg {
  id: number;
  type: 'success' | 'error';
  text: string;
}

const AREAS_DEFINIDAS = ['Taller', 'Bodega', 'EV / Híbridos', 'Recepción'];

export function ResponsabilidadesView() {
  const [periodos, setPeriodos] = useState<PeriodoResponsabilidad[]>([]);
  const [personal, setPersonal] = useState<PersonalTaller[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [showAsignar, setShowAsignar] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [areaHistorial, setAreaHistorial] = useState('');
  const [periodoEditar, setPeriodoEditar] = useState<PeriodoResponsabilidad | undefined>();
  const [periodoACerrar, setPeriodoACerrar] = useState<PeriodoResponsabilidad | null>(null);

  useEffect(() => {
    Promise.all([getActivos(), getPersonal()])
      .then(([p, per]) => {
        setPeriodos(p);
        setPersonal(per);
      })
      .finally(() => setLoading(false));
  }, []);

  const addToast = (type: 'success' | 'error', text: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handleCerrarPeriodo = async (periodo: PeriodoResponsabilidad) => {
    setPeriodoACerrar(periodo);
  };

  const handleConfirmCerrarPeriodo = async () => {
    if (!periodoACerrar) return;
    try {
      await cerrarPeriodo(periodoACerrar.id);
      const updated = await getActivos();
      setPeriodos(updated);
      addToast('success', `Período de ${periodoACerrar.personalNombre} cerrado correctamente.`);
    } catch {
      addToast('error', 'No se pudo cerrar el período.');
    }
  };

  const handleReasignar = (periodo: PeriodoResponsabilidad) => {
    setPeriodoEditar(periodo);
    setShowAsignar(true);
  };

  const handleVerHistorial = (area: string) => {
    setAreaHistorial(area);
    setShowHistorial(true);
  };

  const handleAsignarSuccess = async (
    _p: PeriodoResponsabilidad,
    tipo: 'nueva' | 'reasignada',
  ) => {
    const updated = await getActivos();
    setPeriodos(updated);
    addToast(
      'success',
      tipo === 'nueva' ? 'Responsable asignado correctamente.' : 'Responsable reasignado correctamente.',
    );
  };

  // KPI calculations
  const areasConResponsable = new Set(periodos.map((p) => p.area)).size;
  const areasSinResponsable = AREAS_DEFINIDAS.filter(
    (a) => !periodos.some((p) => p.area === a && p.tipo === 'titular'),
  ).length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Designación de Responsables</h1>
          <p className="text-slate-500 mt-1">
            Asignación y trazabilidad de responsables por área o equipo
          </p>
        </div>
        <button
          onClick={() => {
            setPeriodoEditar(undefined);
            setShowAsignar(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
        >
          <UserCheck size={16} />
          + Asignar Responsable
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {loading ? (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-8 bg-slate-200 rounded w-1/3" />
              </div>
            ))}
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4"
            >
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <UserCheck size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                  Áreas con Responsable
                </p>
                <p className="text-3xl font-bold text-slate-900">{areasConResponsable}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4"
            >
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <UserX size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                  Áreas sin Titular
                </p>
                <p className="text-3xl font-bold text-slate-900">{areasSinResponsable}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4"
            >
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                <Users size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                  Personal Activo
                </p>
                <p className="text-3xl font-bold text-slate-900">{personal.length}</p>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <UserCheck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Responsables Activos</h2>
            <p className="text-xs text-slate-500">Períodos vigentes sin fecha de cierre</p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : periodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Users size={48} className="mb-4 opacity-30" />
            <p className="text-base font-medium">No hay responsables asignados</p>
            <p className="text-sm mt-1">Utiliza el botón "Asignar Responsable" para comenzar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-medium">Área</th>
                  <th className="px-5 py-3 font-medium">Nivel</th>
                  <th className="px-5 py-3 font-medium">Responsable</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Desde</th>
                  <th className="px-5 py-3 font-medium">Permisos</th>
                  <th className="px-5 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periodos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Área */}
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{p.area}</p>
                      {p.caja && (
                        <p className="text-xs text-slate-400 mt-0.5">Caja: {p.caja}</p>
                      )}
                    </td>

                    {/* Nivel */}
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          p.nivel === 'area'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-purple-50 text-purple-700 border border-purple-100'
                        }`}
                      >
                        {p.nivel === 'area' ? 'Área' : 'Caja'}
                      </span>
                    </td>

                    {/* Responsable */}
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{p.personalNombre}</p>
                      <p className="text-xs text-slate-400">ID: {p.personalId}</p>
                    </td>

                    {/* Tipo */}
                    <td className="px-5 py-3">
                      <TipoBadge tipo={p.tipo} />
                    </td>

                    {/* Desde */}
                    <td className="px-5 py-3">
                      <span className="text-slate-700 font-mono text-xs">{p.fechaInicio}</span>
                    </td>

                    {/* Permisos */}
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {p.permisos.slice(0, 3).map((perm) => (
                          <PermisoBadge key={perm} permiso={perm} />
                        ))}
                        {p.permisos.length > 3 && (
                          <span className="text-xs text-slate-400 self-center">
                            +{p.permisos.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Ver historial del área"
                          onClick={() => handleVerHistorial(p.area)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <History size={16} />
                        </button>
                        <button
                          title="Reasignar responsable"
                          onClick={() => handleReasignar(p)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          title="Cerrar período"
                          onClick={() => handleCerrarPeriodo(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <AsignarResponsableModal
        isOpen={showAsignar}
        onClose={() => {
          setShowAsignar(false);
          setPeriodoEditar(undefined);
        }}
        onSuccess={handleAsignarSuccess}
        personal={personal}
        periodos={periodos}
        periodoEditar={periodoEditar}
      />

      <HistorialResponsabilidadModal
        isOpen={showHistorial}
        onClose={() => setShowHistorial(false)}
        area={areaHistorial}
      />

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium pointer-events-auto ${
                t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {t.type === 'success' ? (
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <XCircle size={16} className="text-rose-600 shrink-0" />
              )}
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ConfirmModal
        isOpen={periodoACerrar !== null}
        onClose={() => setPeriodoACerrar(null)}
        onConfirm={handleConfirmCerrarPeriodo}
        title="Cerrar período de responsabilidad"
        message={periodoACerrar
          ? `¿Cerrar el período de ${periodoACerrar.personalNombre} en ${periodoACerrar.area}? Esta acción quedará registrada en el historial.`
          : ''}
        confirmLabel="Sí, cerrar período"
        cancelLabel="Cancelar"
        variant="warning"
      />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: 'titular' | 'co_responsable' }) {
  return tipo === 'titular' ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      Titular
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
      Co-resp.
    </span>
  );
}

function PermisoBadge({ permiso }: { permiso: PermisoResponsabilidad }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
      {PERMISO_LABELS[permiso]}
    </span>
  );
}
