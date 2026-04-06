import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCheck, AlertTriangle, RefreshCw, Users, Loader2 } from 'lucide-react';
import {
  PeriodoResponsabilidad,
  PermisoResponsabilidad,
  NivelResponsabilidad,
  TipoAsignacion,
  PERMISO_LABELS,
} from '../../data/mockData';
import {
  asignarResponsable,
  reasignarResponsable,
} from '../../services/responsabilidadService';
import { Usuario } from '../../services/usuariosService';

const AREAS = ['Taller', 'Bodega', 'EV / Híbridos', 'Recepción', 'Alineación', 'Otra'];
const TODOS_PERMISOS: PermisoResponsabilidad[] = [
  'gestionar_prestamos',
  'aprobar_devoluciones',
  'registrar_fallas',
  'gestionar_epp',
  'ver_reportes',
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (p: PeriodoResponsabilidad, tipo: 'nueva' | 'reasignada') => void;
  personal: Usuario[];
  periodos: PeriodoResponsabilidad[];
  periodoEditar?: PeriodoResponsabilidad;
}

interface FormState {
  area: string;
  nivel: NivelResponsabilidad;
  caja: string;
  personalId: string;
  tipo: TipoAsignacion;
  permisos: PermisoResponsabilidad[];
  fechaInicio: string;
  observacion: string;
}

const defaultForm = (): FormState => ({
  area: '',
  nivel: 'area',
  caja: '',
  personalId: '',
  tipo: 'titular',
  permisos: ['ver_reportes'],
  fechaInicio: new Date().toISOString().split('T')[0],
  observacion: '',
});

export function AsignarResponsableModal({
  isOpen,
  onClose,
  onSuccess,
  personal,
  periodoEditar,
}: Props) {
  const [form, setForm] = useState<FormState>(defaultForm());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [duplicado, setDuplicado] = useState<PeriodoResponsabilidad | null>(null);

  // Reset form when modal opens or periodoEditar changes
  useEffect(() => {
    if (!isOpen) return;
    if (periodoEditar) {
      setForm({
        area: periodoEditar.area,
        nivel: periodoEditar.nivel,
        caja: periodoEditar.caja ?? '',
        personalId: '',
        tipo: 'titular',
        permisos: [...periodoEditar.permisos],
        fechaInicio: new Date().toISOString().split('T')[0],
        observacion: '',
      });
    } else {
      setForm(defaultForm());
    }
    setErrors({});
    setDuplicado(null);
  }, [isOpen, periodoEditar]);

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.area) e.area = 'El área es requerida';
    if (!form.personalId) e.personalId = 'Selecciona un responsable';
    if (form.permisos.length === 0) e.permisos = 'Asigna al menos un permiso';
    if (!form.fechaInicio) e.fechaInicio = 'La fecha de inicio es requerida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildData = (overrideTipo?: TipoAsignacion): Omit<PeriodoResponsabilidad, 'id' | 'notificacionEnviada'> => {
    const persona = personal.find((p) => p.id === form.personalId);
    return {
      nivel: form.nivel,
      area: form.area,
      caja: form.nivel === 'caja' ? form.caja : undefined,
      personalId: form.personalId,
      personalNombre: persona?.nombre ?? '',
      tipo: overrideTipo ?? form.tipo,
      permisos: form.permisos,
      fechaInicio: form.fechaInicio,
      asignadoPor: 'Usuario Actual',
      observacion: form.observacion || undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setDuplicado(null);

    try {
      if (periodoEditar) {
        // Reasignación directa
        const { nuevo } = await reasignarResponsable(periodoEditar.id, buildData());
        onSuccess(nuevo, 'reasignada');
        onClose();
        return;
      }

      const resultado = await asignarResponsable(buildData());
      if (resultado.ok) {
        onSuccess(resultado.periodo, 'nueva');
        onClose();
      } else {
        setDuplicado(resultado.periodoExistente);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReasignarDuplicado = async () => {
    if (!duplicado) return;
    setSubmitting(true);
    try {
      const { nuevo } = await reasignarResponsable(duplicado.id, buildData());
      onSuccess(nuevo, 'reasignada');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCoResponsable = async () => {
    setSubmitting(true);
    setDuplicado(null);
    try {
      const resultado = await asignarResponsable(buildData('co_responsable'));
      if (resultado.ok) {
        onSuccess(resultado.periodo, 'nueva');
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermiso = (p: PermisoResponsabilidad) => {
    setForm((prev) => ({
      ...prev,
      permisos: prev.permisos.includes(p)
        ? prev.permisos.filter((x) => x !== p)
        : [...prev.permisos, p],
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <UserCheck size={18} />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  {periodoEditar ? `Reasignar — ${periodoEditar.area}` : 'Asignar Responsable'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">

                {/* Panel de duplicado */}
                <AnimatePresence>
                  {duplicado && (
                    <DuplicidadPanel
                      duplicado={duplicado}
                      onReasignar={handleReasignarDuplicado}
                      onCoResponsable={handleCoResponsable}
                      onCancelar={() => setDuplicado(null)}
                      submitting={submitting}
                    />
                  )}
                </AnimatePresence>

                {/* Área */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Área <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.area}
                    onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                    disabled={!!periodoEditar}
                    className={`w-full text-sm border rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:bg-slate-50 disabled:text-slate-500 ${
                      errors.area ? 'border-rose-400' : 'border-slate-200'
                    }`}
                  >
                    <option value="">Seleccionar área…</option>
                    {AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  {errors.area && <p className="text-xs text-rose-500 mt-1">{errors.area}</p>}
                </div>

                {/* Nivel */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    Nivel
                  </label>
                  <div className="flex gap-4">
                    {(['area', 'caja'] as NivelResponsabilidad[]).map((n) => (
                      <label key={n} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="nivel"
                          value={n}
                          checked={form.nivel === n}
                          onChange={() => setForm((f) => ({ ...f, nivel: n }))}
                          className="accent-amber-500"
                        />
                        <span className="text-sm text-slate-700 capitalize">
                          {n === 'area' ? 'Área completa' : 'Caja personal'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Caja — solo si nivel=caja */}
                {form.nivel === 'caja' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Caja / Posición
                    </label>
                    <input
                      type="text"
                      value={form.caja}
                      onChange={(e) => setForm((f) => ({ ...f, caja: e.target.value }))}
                      placeholder="Ej: Estante B-2 / Caja Herr."
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    />
                  </div>
                )}

                {/* Personal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Responsable <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.personalId}
                    onChange={(e) => setForm((f) => ({ ...f, personalId: e.target.value }))}
                    className={`w-full text-sm border rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 ${
                      errors.personalId ? 'border-rose-400' : 'border-slate-200'
                    }`}
                  >
                    <option value="">Seleccionar persona…</option>
                    {personal.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — {p.rol}
                      </option>
                    ))}
                  </select>
                  {errors.personalId && (
                    <p className="text-xs text-rose-500 mt-1">{errors.personalId}</p>
                  )}
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Tipo de Asignación
                  </label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoAsignacion }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  >
                    <option value="titular">Titular</option>
                    <option value="co_responsable">Co-Responsable</option>
                  </select>
                </div>

                {/* Permisos */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    Permisos <span className="text-rose-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {TODOS_PERMISOS.map((p) => (
                      <label key={p} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={form.permisos.includes(p)}
                          onChange={() => togglePermiso(p)}
                          className="accent-amber-500 w-4 h-4"
                        />
                        <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                          {PERMISO_LABELS[p]}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.permisos && (
                    <p className="text-xs text-rose-500 mt-1">{errors.permisos}</p>
                  )}
                </div>

                {/* Fecha inicio */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Fecha de Inicio <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.fechaInicio}
                    onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
                    className={`w-full text-sm border rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 ${
                      errors.fechaInicio ? 'border-rose-400' : 'border-slate-200'
                    }`}
                  />
                  {errors.fechaInicio && (
                    <p className="text-xs text-rose-500 mt-1">{errors.fechaInicio}</p>
                  )}
                </div>

                {/* Observación */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Observación
                  </label>
                  <textarea
                    value={form.observacion}
                    onChange={(e) => setForm((f) => ({ ...f, observacion: e.target.value }))}
                    rows={2}
                    placeholder="Contexto o motivo de la asignación…"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !!duplicado}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <UserCheck size={15} />
                  )}
                  {periodoEditar ? 'Reasignar' : 'Asignar'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── DuplicidadPanel ──────────────────────────────────────────────────────────

interface DuplicidadPanelProps {
  duplicado: PeriodoResponsabilidad;
  onReasignar: () => void;
  onCoResponsable: () => void;
  onCancelar: () => void;
  submitting: boolean;
}

function DuplicidadPanel({
  duplicado,
  onReasignar,
  onCoResponsable,
  onCancelar,
  submitting,
}: DuplicidadPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-amber-50 border border-amber-200 rounded-xl p-4"
    >
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Ya existe un titular activo</p>
          <p className="text-xs text-amber-700 mt-0.5">
            <span className="font-medium">{duplicado.personalNombre}</span> es titular en{' '}
            <span className="font-medium">{duplicado.area}</span> desde{' '}
            <span className="font-medium">{duplicado.fechaInicio}</span>.
          </p>
        </div>
      </div>
      <p className="text-xs text-amber-700 mb-3">¿Cómo deseas proceder?</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReasignar}
          disabled={submitting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60"
        >
          <RefreshCw size={13} />
          Reasignar (reemplazar)
        </button>
        <button
          type="button"
          onClick={onCoResponsable}
          disabled={submitting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-60"
        >
          <Users size={13} />
          Agregar como Co-responsable
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <X size={13} />
          Cancelar
        </button>
      </div>
    </motion.div>
  );
}
