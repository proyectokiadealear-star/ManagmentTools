// AssetCatalog.tsx — Catálogo visual con búsqueda y filtros
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Grid3X3, List, Loader2, Package } from 'lucide-react';
import { Asset } from '../../data/mockData';
import { useAssets } from '../../shared/context/AssetContext';
import { AssetCard } from './AssetCard';
import { AssetFilterPanel } from './AssetFilterPanel';
import { AssetDetailModal } from './AssetDetailModal';
import { AvailabilityChecker } from './AvailabilityChecker';
import { SearchParams, getAreas, AreaAPI } from '../../services/assetService';
import { useLocationNames } from '@shared/hooks/useLocationNames';

export const AssetCatalog: React.FC = () => {
  const assets = useAssets();
  const [filtros, setFiltros] = useState<SearchParams>({});
  const [query, setQuery] = useState('');
  const [areas, setAreas] = useState<AreaAPI[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading] = useState(false);

  // Modal state
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [availabilityAsset, setAvailabilityAsset] = useState<Asset | null>(null);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);

  // Cargar áreas para el filtro
  useEffect(() => {
    getAreas().then(setAreas).catch(() => {});
  }, []);

  // Tipos únicos disponibles en los assets cargados
  const tiposDisponibles = useMemo(
    () => [...new Set(assets.map(a => a.tipo).filter(Boolean))].sort(),
    [assets],
  );

  // Filtrado local sobre el contexto (sin llamar al backend en cada keystroke)
  const filteredAssets = useMemo(() => {
    let resultado = [...assets];

    // Búsqueda por texto
    const q = query.trim().toLowerCase();
    if (q) {
      resultado = resultado.filter(a =>
        a.descripcion?.toLowerCase().includes(q) ||
        a.tipo?.toLowerCase().includes(q) ||
        a.serial?.toLowerCase().includes(q) ||
        a.placa?.toLowerCase().includes(q) ||
        a.marca?.toLowerCase().includes(q) ||
        a.custodio?.toLowerCase().includes(q),
      );
    }

    // Filtro por tipo
    if (filtros.tipo) {
      resultado = resultado.filter(a => a.tipo?.toLowerCase() === filtros.tipo!.toLowerCase());
    }

    // Filtro por estado operativo
    if (filtros.estadoOperativo) {
      resultado = resultado.filter(a => (a as any).estadoOperativo === filtros.estadoOperativo);
    }

    // Filtro por área (nombre)
    if (filtros.areaId) {
      const areaNombre = areas.find(ar => ar.id === filtros.areaId)?.nombre;
      if (areaNombre) {
        resultado = resultado.filter(a =>
          a.area?.toLowerCase().includes(areaNombre.toLowerCase()),
        );
      }
    }

    // Filtro por capacidad
    if (filtros.capacidad) {
      resultado = resultado.filter(a =>
        a.capacidadEspecificacion?.toLowerCase().includes(filtros.capacidad!.toLowerCase()),
      );
    }

    return resultado;
  }, [assets, query, filtros, areas]);

  const handleView = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setIsDetailOpen(true);
  }, []);

  const handleSolicitarPrestamo = useCallback((asset: Asset) => {
    setAvailabilityAsset(asset);
    setIsAvailabilityOpen(true);
  }, []);

  const handleResetFiltros = useCallback(() => {
    setFiltros({});
    setQuery('');
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800">Catálogo Visual del Taller</h1>
        <p className="text-sm text-slate-500">
          {filteredAssets.length} activo{filteredAssets.length !== 1 ? 's' : ''} encontrado{filteredAssets.length !== 1 ? 's' : ''}
          {assets.length !== filteredAssets.length && ` de ${assets.length} total`}
        </p>
      </div>

      {/* Barra de búsqueda + controles */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, tipo, serial, placa, custodio..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        {/* Toggle vista */}
        <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Panel de filtros */}
        <AssetFilterPanel
          filtros={filtros}
          areas={areas}
          tiposDisponibles={tiposDisponibles}
          onChange={setFiltros}
          onReset={handleResetFiltros}
        />

        {/* Grilla / lista de activos */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400"
            >
              <Package className="w-12 h-12" />
              <p className="text-sm font-medium">No se encontraron activos con estos criterios</p>
              <button
                onClick={handleResetFiltros}
                className="text-xs text-indigo-500 hover:underline"
              >
                Limpiar filtros
              </button>
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
              <AnimatePresence>
                {filteredAssets.map(asset => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onView={handleView}
                    onSolicitarPrestamo={handleSolicitarPrestamo}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            /* Vista lista */
            <div className="flex flex-col gap-2 pb-6">
              <AnimatePresence>
                {filteredAssets.map(asset => (
                  <AssetListRow
                    key={asset.id}
                    asset={asset}
                    onView={handleView}
                    onSolicitarPrestamo={handleSolicitarPrestamo}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <AssetDetailModal
        asset={selectedAsset}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onSolicitarPrestamo={selectedAsset ? () => handleSolicitarPrestamo(selectedAsset) : undefined}
      />
      <AvailabilityChecker
        asset={availabilityAsset}
        isOpen={isAvailabilityOpen}
        onClose={() => setIsAvailabilityOpen(false)}
      />
    </div>
  );
};

// ─── Vista Lista (fila compacta) ────────────────────────────────────────────────
interface RowProps {
  asset: Asset;
  onView: (a: Asset) => void;
  onSolicitarPrestamo: (a: Asset) => void;
}

const ESTADO_COLORS: Record<string, string> = {
  disponible: 'bg-green-100 text-green-700',
  'en-prestamo': 'bg-yellow-100 text-yellow-700',
  'en-mantenimiento': 'bg-blue-100 text-blue-700',
  danado: 'bg-red-100 text-red-700',
};

const ESTADO_LABELS: Record<string, string> = {
  disponible: 'Disponible',
  'en-prestamo': 'En Préstamo',
  'en-mantenimiento': 'En Mantenimiento',
  danado: 'Dañado',
};

function AssetListRow({ asset, onView, onSolicitarPrestamo }: RowProps) {
  const resolveLocation = useLocationNames();
  const estadoOp = (asset as any).estadoOperativo ?? 'disponible';
  const ubicacion = [resolveLocation(asset.area), resolveLocation(asset.bahia), resolveLocation(asset.rack), resolveLocation(asset.caja)].filter(Boolean).join(' > ') || asset.ubicacion || '—';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => onView(asset)}
    >
      {/* Imagen mini */}
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
        {asset.imagenUrl
          ? <img src={asset.imagenUrl} alt="" className="w-full h-full object-cover" />
          : <Package className="w-5 h-5 text-slate-400" />
        }
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{asset.descripcion}</p>
        <p className="text-xs text-slate-500 truncate">{asset.tipo} · {asset.marca}</p>
      </div>
      {/* Placa */}
      <span className="text-xs font-mono text-slate-500 hidden md:block shrink-0">#{asset.placa || '—'}</span>
      {/* Ubicación */}
      <span className="text-xs text-slate-500 hidden lg:block max-w-[200px] truncate shrink-0">{ubicacion}</span>
      {/* Estado */}
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ESTADO_COLORS[estadoOp] ?? 'bg-gray-100 text-gray-600'}`}>
        {ESTADO_LABELS[estadoOp] ?? estadoOp}
      </span>
      {/* Acción */}
      {estadoOp === 'disponible' && (
        <button
          className="text-xs font-medium text-green-600 hover:text-green-800 shrink-0 transition-colors"
          onClick={e => { e.stopPropagation(); onSolicitarPrestamo(asset); }}
        >
          Solicitar
        </button>
      )}
    </motion.div>
  );
}
