// WorkshopOverview.tsx — Dashboard con vista general del taller
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Users, MapPin, Wrench,
  CheckCircle, TrendingUp, Filter, ChevronRight
} from 'lucide-react';
import { useAssets } from '../../shared/context/AssetContext';
import { Asset } from '../../data/mockData';
import { EstadisticasResponse, getEstadisticas } from '../../services/assetService';
import { useLocationNames } from '@shared/hooks/useLocationNames';
import { useNavigate } from 'react-router-dom';

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
function AreaDistributionChart({ assets }: { assets: Asset[] }) {
  const byArea = assets.reduce((acc, a) => {
    const area = a.area || 'Sin área';
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = assets.length;
  const sorted = Object.entries(byArea).sort(([, a], [, b]) => b - a);
  const COLORS = ['bg-indigo-400', 'bg-amber-400', 'bg-green-400', 'bg-rose-400', 'bg-purple-400', 'bg-cyan-400'];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-slate-700">Distribución por Área</h3>
      <div className="flex flex-col gap-3">
        {sorted.map(([area, count], i) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={area} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium">{area}</span>
                <span className="text-slate-400">{count} ({pct}%)</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className={`h-full rounded-full ${COLORS[i % COLORS.length]}`}
                />
              </div>
            </div>
          );
        })}
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

  const FILTROS_OPCIONES = [
    { value: '', label: 'Todos' },
    { value: 'disponible', label: 'Disponibles' },
    { value: 'en-prestamo', label: 'En Préstamo' },
    { value: 'en-mantenimiento', label: 'Mantenimiento' },
    { value: 'danado', label: 'Dañados' },
  ];

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
        <AreaDistributionChart assets={assets} />

        {/* Tabla de activos filtrada */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {/* Header tabla */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-700">
              Activos {filtroEstado ? `— ${FILTROS_OPCIONES.find(f => f.value === filtroEstado)?.label}` : ''}
              <span className="ml-2 text-xs text-slate-400">({filteredAssets.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none"
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
            {filteredAssets.slice(0, 50).map(asset => {
              const ubicacion = [resolveLocation(asset.area), resolveLocation(asset.bahia), resolveLocation(asset.rack)].filter(Boolean).join(' > ') || asset.ubicacion || '—';
              return (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-slate-50 cursor-pointer transition-colors group"
                  onClick={() => navigate('/locations')}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{asset.descripcion}</p>
                    <p className="text-xs text-slate-400 truncate">{ubicacion}</p>
                  </div>
                  <div className="text-xs text-slate-500 hidden md:block shrink-0">{asset.custodio || '—'}</div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                </div>
              );
            })}
            {filteredAssets.length === 0 && (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                No hay activos con este filtro
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
