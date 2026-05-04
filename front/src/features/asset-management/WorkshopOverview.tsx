// WorkshopOverview.tsx — Dashboard con vista general del taller
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Users, MapPin, Wrench,
  CheckCircle, TrendingUp, Filter, ChevronRight,
  X, Search, AlertTriangle, Calendar, DollarSign,
  Activity, Settings, Truck
} from 'lucide-react';
import { useAssets } from '../../shared/context/AssetContext';
import { Asset } from '../../data/mockData';
import { EstadisticasResponse, getEstadisticas } from '../../services/assetService';
import { useLocationNames } from '@shared/hooks/useLocationNames';
import { useNavigate } from 'react-router-dom';
import { AssetDetailModal } from './AssetDetailModal';
import { calcDepreciation } from '@shared/utils/depreciation';

// ─── StatCard ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  total?: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick?: () => void;
}

function StatCard({ label, value, total, icon, color, bgColor, onClick }: StatCardProps) {
  const pct = total && total > 0 ? Math.round((value / total) * 100) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.02 } : {}}
      className={`bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className={`${bgColor} p-2.5 rounded-xl`}>
          <span className={color}>{icon}</span>
        </div>
        {pct !== null && (
          <span className="text-xs text-slate-400 font-medium">{pct}%</span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      </div>
      {total && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${bgColor.replace('bg-', 'bg-').replace('-100', '-400')}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── AreaDistributionChart ────────────────────────────────────────────────────
interface AreaDistributionChartProps {
  assets: Asset[];
  onAreaClick: (areaId: string) => void;
}

function AreaDistributionChart({ assets, onAreaClick }: AreaDistributionChartProps) {
  const resolveLocation = useLocationNames();
  
  const byArea = assets.reduce((acc, a) => {
    const areaId = a.area || 'sin-area';
    const areaNombre = resolveLocation(areaId) || 'Sin área asignada';
    if (!acc[areaId]) {
      acc[areaId] = { nombre: areaNombre, count: 0 };
    }
    acc[areaId].count += 1;
    return acc;
  }, {} as Record<string, { nombre: string; count: number }>);

  const total = assets.length;
  const sorted = Object.entries(byArea).sort(([, a], [, b]) => b.count - a.count);
  
  const COLORS = [
    { bg: 'bg-indigo-500', light: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-700' },
    { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-700' },
    { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-700' },
    { bg: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-700' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500" />
          Distribución por Área
        </h3>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
          {total} activos
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {sorted.map(([areaId, data], i) => {
          const pct = total > 0 ? Math.round((data.count / total) * 100) : 0;
          const colorScheme = COLORS[i % COLORS.length];
          return (
            <motion.button
              key={areaId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              onClick={() => onAreaClick(areaId)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group text-left w-full"
            >
              <div className={`w-10 h-10 rounded-lg ${colorScheme.light} flex items-center justify-center shrink-0`}>
                <MapPin className={`w-5 h-5 ${colorScheme.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 truncate group-hover:text-slate-900">
                    {data.nombre}
                  </span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {data.count} {data.count === 1 ? 'activo' : 'activos'}
                  </span>
                </div>
                <div className="mt-1.5 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.05 }}
                    className={`h-full rounded-full ${colorScheme.bg}`}
                  />
                </div>
              </div>
              <span className={`text-xs font-medium ${colorScheme.text} shrink-0`}>
                {pct}%
              </span>
            </motion.button>
          );
        })}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <MapPin className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">No hay activos con área asignada</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WorkshopOverview ────────────────────────────────────────────────────────
export const WorkshopOverview: React.FC = () => {
  const assets = useAssets();
  const navigate = useNavigate();
  const resolveLocation = useLocationNames();
  const [estadisticas, setEstadisticas] = useState<EstadisticasResponse | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    getEstadisticas()
      .then(setEstadisticas)
      .catch(() => {
        // Calcular localmente si el backend no responde
        const total = assets.length;
        setEstadisticas({
          total,
          enCajasPersonales: assets.filter((a: any) => a.cajaId && a.custodio).length,
          enUbicacionesFijas: assets.filter((a: any) => !a.cajaId).length,
          enPrestamo: assets.filter((a: any) => a.estadoOperativo === 'en-prestamo').length,
          enMantenimiento: assets.filter((a: any) => a.estadoOperativo === 'en-mantenimiento').length,
          danados: assets.filter((a: any) => a.estadoOperativo === 'danado').length,
          disponibles: assets.filter((a: any) => !a.estadoOperativo || a.estadoOperativo === 'disponible').length,
        });
      });
  }, [assets]);

  // Filtrado de la tabla
  const filteredAssets = filtroEstado
    ? assets.filter((a: any) => a.estadoOperativo === filtroEstado || a.estado === filtroEstado)
    : assets;

  // Filtrado por búsqueda
  const searchedAssets = searchTerm
    ? filteredAssets.filter(a => 
        a.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.custodio?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filteredAssets;

  // Activos del área seleccionada
  const assetsInSelectedArea = selectedAreaId
    ? assets.filter(a => a.area === selectedAreaId)
    : [];

  const FILTROS_OPCIONES = [
    { value: '', label: 'Todos' },
    { value: 'disponible', label: 'Disponibles' },
    { value: 'en-prestamo', label: 'En Préstamo' },
    { value: 'en-mantenimiento', label: 'Mantenimiento' },
    { value: 'danado', label: 'Dañados' },
  ];

  const handleAreaClick = (areaId: string) => {
    setSelectedAreaId(areaId === selectedAreaId ? null : areaId);
  };

  const getAreaNombre = (areaId: string | null) => {
    if (!areaId) return 'Sin área';
    return resolveLocation(areaId) || 'Área sin nombre';
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vista General del Taller</h1>
          <p className="text-sm text-slate-500 mt-0.5">Punto central de todos los activos registrados</p>
        </div>
        <button
          className="flex items-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors"
          onClick={() => navigate('/locations')}
        >
          <Package className="w-4 h-4" />
          Ir al Catálogo
        </button>
      </div>

      {/* KPI Cards */}
      {estadisticas && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Total Activos"
            value={estadisticas.total}
            icon={<Package className="w-5 h-5" />}
            color="text-slate-600"
            bgColor="bg-slate-100"
          />
          <StatCard
            label="Disponibles"
            value={estadisticas.disponibles}
            total={estadisticas.total}
            icon={<CheckCircle className="w-5 h-5" />}
            color="text-green-600"
            bgColor="bg-green-100"
            onClick={() => setFiltroEstado('disponible')}
          />
          <StatCard
            label="En Cajas Personales"
            value={estadisticas.enCajasPersonales}
            total={estadisticas.total}
            icon={<Users className="w-5 h-5" />}
            color="text-purple-600"
            bgColor="bg-purple-100"
          />
          <StatCard
            label="Ubicaciones Fijas"
            value={estadisticas.enUbicacionesFijas}
            total={estadisticas.total}
            icon={<MapPin className="w-5 h-5" />}
            color="text-indigo-600"
            bgColor="bg-indigo-100"
          />
          <StatCard
            label="En Préstamo"
            value={estadisticas.enPrestamo}
            total={estadisticas.total}
            icon={<TrendingUp className="w-5 h-5" />}
            color="text-amber-600"
            bgColor="bg-amber-100"
            onClick={() => setFiltroEstado('en-prestamo')}
          />
          <StatCard
            label="En Mantenimiento"
            value={estadisticas.enMantenimiento}
            total={estadisticas.total}
            icon={<Wrench className="w-5 h-5" />}
            color="text-blue-600"
            bgColor="bg-blue-100"
            onClick={() => setFiltroEstado('en-mantenimiento')}
          />
        </div>
      )}

      {/* Gráfico + Tabla */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de distribución */}
        <AreaDistributionChart assets={assets} onAreaClick={handleAreaClick} />

        {/* Tabla de activos filtrada */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Header tabla */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700">
                Activos
                {filtroEstado && (
                  <span className="ml-1 text-indigo-600">
                    — {FILTROS_OPCIONES.find(f => f.value === filtroEstado)?.label}
                  </span>
                )}
              </h3>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {searchedAssets.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar activos..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-40"
                />
              </div>
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
              >
                {FILTROS_OPCIONES.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filas */}
          <div className="overflow-y-auto max-h-[420px]">
            {searchedAssets.slice(0, 50).map(asset => {
              const ubicacion = [resolveLocation(asset.area), resolveLocation(asset.bahia), resolveLocation(asset.rack)].filter(Boolean).join(' > ') || asset.ubicacion || '—';
              
              // Determinar color del estado
              const estadoColor = 
                asset.estadoOperativo === 'disponible' ? 'bg-emerald-500' :
                asset.estadoOperativo === 'en-prestamo' ? 'bg-amber-500' :
                asset.estadoOperativo === 'en-mantenimiento' ? 'bg-blue-500' :
                asset.estadoOperativo === 'danado' ? 'bg-rose-500' : 'bg-slate-400';
              
              return (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                  onClick={() => setSelectedAsset(asset)}
                >
                  <div className={`w-2 h-10 rounded-full ${estadoColor} shrink-0`} />
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    {asset.imagenUrl ? (
                      <img src={asset.imagenUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Package className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-700">
                      {asset.descripcion}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 truncate">{ubicacion}</span>
                      {asset.custodio && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 truncate">{asset.custodio}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                      asset.estadoOperativo === 'disponible' ? 'bg-emerald-50 text-emerald-700' :
                      asset.estadoOperativo === 'en-prestamo' ? 'bg-amber-50 text-amber-700' :
                      asset.estadoOperativo === 'en-mantenimiento' ? 'bg-blue-50 text-blue-700' :
                      asset.estadoOperativo === 'danado' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {asset.estadoOperativo === 'disponible' ? 'Disponible' :
                       asset.estadoOperativo === 'en-prestamo' ? 'En Préstamo' :
                       asset.estadoOperativo === 'en-mantenimiento' ? 'Mantenimiento' :
                       asset.estadoOperativo === 'danado' ? 'Dañado' : 'Sin estado'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 shrink-0 transition-colors" />
                </motion.div>
              );
            })}
            {searchedAssets.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <Package className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">No se encontraron activos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel de activos por área */}
      <AnimatePresence>
        {selectedAreaId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedAreaId(null)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{getAreaNombre(selectedAreaId)}</h2>
                    <p className="text-sm text-slate-500">{assetsInSelectedArea.length} activos en esta área</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAreaId(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Lista de activos */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assetsInSelectedArea.map(asset => (
                    <motion.button
                      key={asset.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        setSelectedAreaId(null);
                        setSelectedAsset(asset);
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left group"
                    >
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {asset.imagenUrl ? (
                          <img src={asset.imagenUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-700">
                          {asset.descripcion}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {asset.codigo} {asset.marca ? `• ${asset.marca}` : ''}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 shrink-0" />
                    </motion.button>
                  ))}
                </div>
                {assetsInSelectedArea.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Package className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">No hay activos en esta área</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de detalle de activo */}
      <AssetDetailModal
        asset={selectedAsset}
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
      />
    </div>
  );
};
