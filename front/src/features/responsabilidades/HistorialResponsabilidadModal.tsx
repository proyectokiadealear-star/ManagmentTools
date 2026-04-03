import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, CheckCircle, Clock } from 'lucide-react';
import { PeriodoResponsabilidad } from '../../data/mockData';
import { getHistorialPorArea } from '../../services/responsabilidadService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  area: string;
}

export function HistorialResponsabilidadModal({ isOpen, onClose, area }: Props) {
  const [historial, setHistorial] = useState<PeriodoResponsabilidad[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !area) return;
    setLoading(true);
    getHistorialPorArea(area)
      .then(setHistorial)
      .finally(() => setLoading(false));
  }, [isOpen, area]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <History size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Historial de Responsables</h2>
                  <p className="text-xs text-slate-500">{area}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="w-3 h-3 rounded-full bg-slate-200 mt-1.5 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-2/3" />
                        <div className="h-3 bg-slate-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : historial.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <History size={40} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">Sin historial para esta área</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-slate-200" />

                  <div className="space-y-6 pl-6">
                    {historial.map((p, i) => {
                      const activo = !p.fechaFin;
                      return (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="relative"
                        >
                          {/* Node */}
                          <div
                            className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                              activo
                                ? 'bg-emerald-500 border-emerald-300'
                                : 'bg-slate-300 border-slate-200'
                            }`}
                          />

                          {/* Card */}
                          <div
                            className={`rounded-xl border p-4 ${
                              activo
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {p.personalNombre}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">{p.tipo === 'titular' ? 'Titular' : 'Co-responsable'}</p>
                              </div>
                              {activo ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                                  <CheckCircle size={10} />
                                  Activo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                                  <Clock size={10} />
                                  Cerrado
                                </span>
                              )}
                            </div>

                            <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                              <p>
                                <span className="font-medium text-slate-600">Desde:</span>{' '}
                                {p.fechaInicio}
                                {p.fechaFin && (
                                  <>
                                    {' '}
                                    <span className="font-medium text-slate-600">hasta:</span>{' '}
                                    {p.fechaFin}
                                  </>
                                )}
                              </p>
                              <p>
                                <span className="font-medium text-slate-600">Tipo:</span>{' '}
                                {p.tipo === 'titular' ? 'Titular' : 'Co-responsable'}
                              </p>
                              <p>
                                <span className="font-medium text-slate-600">Asignado por:</span>{' '}
                                {p.asignadoPor}
                              </p>
                              {p.observacion && (
                                <p className="mt-1 italic text-slate-400">"{p.observacion}"</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
