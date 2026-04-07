import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Asset } from '../../data/mockData';
import { httpClient } from '../../services/httpClient';

interface ReportarFallaModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
}

const emptyForm = {
  descripcionSintomas: '',
  impactoOperativo: '',
  fechaDeteccion: new Date().toISOString().split('T')[0],
};

export function ReportarFallaModal({ asset, isOpen, onClose }: ReportarFallaModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setForm(emptyForm);
    setSaved(false);
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!asset) return;
    setSaving(true);
    setError(null);
    try {
      await httpClient.post('/api/fallas', {
        activoId: asset.id,
        activoNombre: asset.descripcion,
        descripcionSintomas: form.descripcionSintomas.trim(),
        impactoOperativo: form.impactoOperativo.trim(),
        reportadoPor: 'demo-user',
        reportadoPorNombre: 'Usuario Demo',
        fechaDeteccion: form.fechaDeteccion,
      });
      setSaved(true);
      setForm(emptyForm);
    } catch {
      setError('No se pudo registrar la falla. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-500" />
                <h2 className="text-base font-bold text-slate-900">Reportar Falla</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Activo info badge */}
              {asset && (
                <div className="mb-5 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Activo afectado</p>
                    <p className="text-sm font-semibold text-slate-800">{asset.descripcion}</p>
                    <p className="text-xs text-slate-400 font-mono">{asset.codigo} · PLACA: {asset.placa}</p>
                  </div>
                </div>
              )}

              {saved ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3 py-8 text-center"
                >
                  <CheckCircle2 size={48} className="text-emerald-500" strokeWidth={1.5} />
                  <p className="font-semibold text-slate-800">Falla registrada correctamente</p>
                  <p className="text-sm text-slate-500">
                    La falla quedó en estado <strong>Reportada</strong> y será evaluada por el Jefe de Taller.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Cerrar
                  </button>
                </motion.div>
              ) : (
                <form id="reportar-falla-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Descripción de la falla / síntomas <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe detalladamente el problema observado…"
                      value={form.descripcionSintomas}
                      onChange={(e) => setForm({ ...form, descripcionSintomas: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-rose-500 focus:border-rose-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Impacto operativo <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Ej: Servicio detenido, no se pueden realizar alineaciones…"
                      value={form.impactoOperativo}
                      onChange={(e) => setForm({ ...form, impactoOperativo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-rose-500 focus:border-rose-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Fecha de detección <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="date"
                      value={form.fechaDeteccion}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setForm({ ...form, fechaDeteccion: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                    <AlertTriangle size={13} className="flex-shrink-0" />
                    La falla quedará en estado <strong className="ml-0.5">"Reportada"</strong> hasta ser evaluada por el Jefe de Taller.
                  </div>

                  {error && (
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Footer — hidden after success */}
            {!saved && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="reportar-falla-form"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-60 transition-colors"
                >
                  <Save size={15} />
                  {saving ? 'Registrando…' : 'Registrar Falla'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
