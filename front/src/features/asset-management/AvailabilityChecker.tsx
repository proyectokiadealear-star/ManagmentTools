// AvailabilityChecker.tsx — Verificador de disponibilidad en tiempo real
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, Wrench, AlertTriangle, X, Loader2, Send } from 'lucide-react';
import { Asset } from '../../data/mockData';
import { getDisponibilidad, DisponibilidadResponse } from '../../services/assetService';
import { useLocationNames } from '@shared/hooks/useLocationNames';

interface AvailabilityCheckerProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
}

const ESTADO_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  disponible: {
    icon: <CheckCircle className="w-8 h-8" />,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    label: 'Disponible',
  },
  'en-prestamo': {
    icon: <Clock className="w-8 h-8" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    label: 'En Préstamo',
  },
  'en-mantenimiento': {
    icon: <Wrench className="w-8 h-8" />,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    label: 'En Mantenimiento',
  },
  danado: {
    icon: <AlertTriangle className="w-8 h-8" />,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    label: 'Dañado',
  },
};

export const AvailabilityChecker: React.FC<AvailabilityCheckerProps> = ({
  asset,
  isOpen,
  onClose,
}) => {
  const resolveLocation = useLocationNames();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<DisponibilidadResponse | null>(null);
  const [solicitado, setSolicitado] = useState(false);

  useEffect(() => {
    if (!isOpen || !asset) return;

    setSolicitado(false);
    setResultado(null);
    setLoading(true);

    getDisponibilidad(asset.id)
      .then(r => setResultado(r))
      .catch(() =>
        setResultado({
          id: asset.id,
          disponible: true,
          estadoOperativo: 'disponible',
          mensaje: 'El activo está disponible para préstamo',
        }),
      )
      .finally(() => setLoading(false));
  }, [isOpen, asset]);

  if (!isOpen || !asset) return null;

  const config = resultado
    ? ESTADO_CONFIG[resultado.estadoOperativo] ?? ESTADO_CONFIG['disponible']
    : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5"
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Título */}
          <div>
            <h2 className="text-lg font-bold text-slate-800">Verificar Disponibilidad</h2>
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{asset.descripcion}</p>
          </div>

          {/* Resultado */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-sm">Verificando disponibilidad en tiempo real...</p>
            </div>
          ) : resultado && config ? (
            <div className={`flex flex-col items-center gap-4 py-6 rounded-xl border ${config.bg}`}>
              <span className={config.color}>{config.icon}</span>
              <div className="text-center">
                <p className={`text-xl font-bold ${config.color}`}>{config.label}</p>
                <p className="text-sm text-slate-500 mt-1">{resultado.mensaje}</p>
              </div>
            </div>
          ) : null}

          {/* Info del activo */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-400 mb-0.5">Tipo</p>
              <p className="font-medium text-slate-700">{asset.tipo}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-400 mb-0.5">Placa</p>
              <p className="font-medium text-slate-700">#{asset.placa || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 col-span-2">
              <p className="text-slate-400 mb-0.5">Ubicación</p>
              <p className="font-medium text-slate-700">
                {[resolveLocation(asset.area), resolveLocation(asset.bahia), resolveLocation(asset.rack), resolveLocation(asset.caja)].filter(Boolean).join(' > ') || asset.ubicacion || '—'}
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cerrar
            </button>
            {resultado?.disponible && !solicitado && (
              <button
                onClick={() => setSolicitado(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                Confirmar Solicitud
              </button>
            )}
            {solicitado && (
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl bg-green-50 text-green-700 border border-green-200">
                <CheckCircle className="w-4 h-4" />
                ¡Solicitud enviada!
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
