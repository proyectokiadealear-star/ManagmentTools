// AssetCard.tsx — Tarjeta individual del catálogo visual
import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Eye, Wrench, AlertTriangle, CheckCircle, Clock, Ban } from 'lucide-react';
import { Asset } from '../../data/mockData';
import { useLocationNames } from '@shared/hooks/useLocationNames';

interface AssetCardProps {
  asset: Asset;
  onView: (asset: Asset) => void;
  onSolicitarPrestamo?: (asset: Asset) => void;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  disponible: {
    label: 'Disponible',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  'en-prestamo': {
    label: 'En Préstamo',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  'en-mantenimiento': {
    label: 'En Mantenimiento',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Wrench className="w-3.5 h-3.5" />,
  },
  danado: {
    label: 'Dañado',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
};

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onView, onSolicitarPrestamo }) => {
  const resolveLocation = useLocationNames();
  const estadoOp = (asset as any).estadoOperativo ?? 'disponible';
  const estadoCfg = ESTADO_CONFIG[estadoOp] ?? ESTADO_CONFIG['disponible'];
  const esDadoDeBaja = asset.estado === 'Dado de Baja';
  const estaDisponible = estadoOp === 'disponible' && !esDadoDeBaja;

  // Construir texto de ubicación usando nombres legibles (nunca UUIDs)
  const ubicacion = [resolveLocation(asset.area), resolveLocation(asset.bahia), resolveLocation(asset.rack), resolveLocation(asset.caja)]
    .filter(Boolean)
    .join(' > ') || asset.ubicacion || '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onView(asset)}
    >
      {/* Imagen */}
      <div className="relative h-36 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden">
        {asset.imagenUrl ? (
          <img
            src={asset.imagenUrl}
            alt={asset.descripcion}
            className={`w-full h-full object-cover ${esDadoDeBaja ? 'opacity-40 grayscale' : ''}`}
          />
        ) : (
          <div className={`flex flex-col items-center gap-1 ${esDadoDeBaja ? 'text-slate-300' : 'text-slate-400'}`}>
            <Wrench className="w-10 h-10" />
            <span className="text-xs">{asset.tipo}</span>
          </div>
        )}
        {/* Badge estado: Dado de Baja tiene prioridad */}
        {esDadoDeBaja ? (
          <span className="absolute top-2 right-2 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-300">
            <Ban className="w-3.5 h-3.5" />
            Dado de Baja
          </span>
        ) : (
          <span
            className={`absolute top-2 right-2 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${estadoCfg.color}`}
          >
            {estadoCfg.icon}
            {estadoCfg.label}
          </span>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{asset.tipo}</p>
          <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 mt-0.5">
            {asset.descripcion}
          </h3>
          {asset.marca && (
            <p className="text-xs text-slate-500 mt-0.5">
              {asset.marca} {asset.modelo && `· ${asset.modelo}`}
            </p>
          )}
        </div>

        {/* Placa */}
        {asset.placa && (
          <p className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded w-fit border border-slate-200">
            #{asset.placa}
          </p>
        )}

        {/* Ubicación */}
        <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-auto">
          <MapPin className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{ubicacion}</span>
        </div>

        {/* Custodio */}
        {asset.custodio && (
          <p className="text-xs text-slate-400 truncate">👤 {asset.custodio}</p>
        )}
      </div>

      {/* Acciones */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          onClick={e => { e.stopPropagation(); onView(asset); }}
        >
          <Eye className="w-3.5 h-3.5" />
          Ver ficha
        </button>
        {estaDisponible && onSolicitarPrestamo && (
          <button
            className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
            onClick={e => { e.stopPropagation(); onSolicitarPrestamo(asset); }}
          >
            Solicitar
          </button>
        )}
      </div>
    </motion.div>
  );
};
