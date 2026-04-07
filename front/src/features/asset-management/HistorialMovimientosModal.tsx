import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, MapPin, User, Calendar, PackageSearch } from 'lucide-react';
import { getMovimientos, getLocationTree, MovimientoAPI } from '../../services/assetService';

interface HistorialMovimientosModalProps {
  assetId: string | null;
  assetNombre: string;
  isOpen: boolean;
  onClose: () => void;
}

function formatFecha(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-EC', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function UbicacionTag({ label }: { label?: string }) {
  if (!label) return <span className="text-slate-400 text-xs italic">—</span>;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
      <MapPin size={10} className="text-blue-400" />
      {label}
    </span>
  );
}

export function HistorialMovimientosModal({
  assetId,
  assetNombre,
  isOpen,
  onClose,
}: HistorialMovimientosModalProps) {
  const [movimientos, setMovimientos] = useState<MovimientoAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameMapRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !assetId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getMovimientos(assetId),
      getLocationTree(),
    ]).then(([movs, tree]) => {
      // Build id→name map for areas, bahias, racks
      const map: Record<string, string> = {};
      tree.areas.forEach(a => { map[a.id] = a.nombre; });
      tree.bahias.forEach(b => { map[b.id] = b.nombre; });
      tree.racks.forEach(r => { map[r.id] = r.nombre; });
      nameMapRef.current = map;
      setMovimientos(movs);
    }).catch(() => setError('No se pudo cargar el historial.'))
      .finally(() => setLoading(false));
  }, [isOpen, assetId]);

  function resolveUbicacion(ub?: MovimientoAPI['desde']): string | undefined {
    if (!ub) return undefined;
    const map = nameMapRef.current;
    const parts = [
      ub.areaNombre ?? (ub.areaId ? (map[ub.areaId] ?? ub.areaId) : undefined),
      ub.bahiaNombre ?? (ub.bahiaId ? (map[ub.bahiaId] ?? undefined) : undefined),
      ub.rackNombre  ?? (ub.rackId  ? (map[ub.rackId]  ?? undefined) : undefined),
    ].filter(Boolean);
    return parts.length ? parts.join(' / ') : undefined;
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
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div>
                <h2 className="text-base font-bold text-slate-900">Historial de Movimientos</h2>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{assetNombre}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading && (
                <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                  Cargando historial…
                </div>
              )}

              {error && !loading && (
                <div className="flex items-center justify-center h-40 text-rose-500 text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && movimientos.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                  <PackageSearch size={40} strokeWidth={1.2} />
                  <p className="text-sm">No hay movimientos registrados para este activo.</p>
                </div>
              )}

              {!loading && !error && movimientos.length > 0 && (
                <ol className="relative border-l-2 border-slate-100 ml-3 space-y-0">
                  {movimientos.map((mov, idx) => (
                    <li key={mov.id ?? idx} className="mb-6 ml-6">
                      {/* Timeline dot */}
                      <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 border-2 border-blue-300 ring-4 ring-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      </span>

                      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
                        {/* Date & User */}
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {formatFecha(mov.fecha)}
                          </span>
                          {mov.usuarioNombre && (
                            <span className="flex items-center gap-1">
                              <User size={11} />
                              {mov.usuarioNombre}
                            </span>
                          )}
                        </div>

                        {/* Motivo */}
                        <p className="text-sm font-medium text-slate-800 leading-snug">
                          {mov.motivo || 'Sin descripción'}
                        </p>

                        {/* Desde → Hasta */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <UbicacionTag label={resolveUbicacion(mov.desde)} />
                          <ArrowRight size={12} className="text-slate-300 flex-shrink-0" />
                          <UbicacionTag label={resolveUbicacion(mov.hasta)} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
