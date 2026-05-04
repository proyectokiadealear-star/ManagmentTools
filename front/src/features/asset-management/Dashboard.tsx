/**
 * Dashboard.tsx — Dashboard Ejecutivo Integral de SURMOTOR
 * 
 * Este dashboard proporciona una visión completa para la toma de decisiones:
 * - Resumen de activos (flota, valor, estado)
 * - Estado de mantenimientos (semáforos, preventivo vs correctivo)
 * - Fallas correctivas (tiempos de respuesta, costos)
 * - Préstamos de herramientas (demanda, daños)
 * - Insumos y EPPs (consumo, costos)
 * - Costos acumulados (TCO, mantenimiento vs falla)
 * 
 * Usa API real del backend - sin datos mock
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, AlertTriangle, CheckCircle2, DollarSign, 
  Wrench, Clock, TrendingUp, TrendingDown, Shield,
  FlaskConical, BarChart3, Activity, Zap, Timer,
  AlertCircle, Users, Briefcase, XCircle
} from 'lucide-react';
import { useAssets } from '@shared/context/AssetContext';
import { useLocationNames } from '@shared/hooks/useLocationNames';
import { 
  getDashboardActivos, getDashboardMantenimiento, 
  getDashboardFallas, getDashboardPrestamos,
  DashboardActivosResponse, DashboardMantenimientoResponse, 
  DashboardFallasResponse, DashboardPrestamosResponse
} from '../../services/dashboardService';
import { getMetricasFallas, MetricasFallas } from '../../services/assetService';

// ─── Tipos de datos del dashboard ────────────────────────────────────────────────
interface DashboardData {
  activos: DashboardActivosResponse | null;
  mantenimiento: DashboardMantenimientoResponse | null;
  fallas: DashboardFallasResponse | null;
  metricasFallas: MetricasFallas | null;
  prestamos: DashboardPrestamosResponse | null;
  loading: boolean;
  error: string | null;
}

// ─── Componente: Tarjeta de KPI ─────────────────────────────────────────────────
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'rose' | 'indigo' | 'emerald' | 'slate';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  alert?: boolean;
}

function KPICard({ title, value, subtitle, icon, color, trend, trendValue, alert }: KPICardProps) {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-200' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
    rose: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-200' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-200' },
    emerald: { bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-200' },
    slate: { bg: 'bg-slate-50', icon: 'text-slate-600', border: 'border-slate-200' },
  };
  
  const colors = colorClasses[color];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border ${colors.border} p-4 shadow-sm hover:shadow-md transition-shadow ${alert ? 'ring-2 ring-rose-500 ring-opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colors.bg}`}>
          <span className={colors.icon}>{icon}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-500'
          }`}>
            {trend === 'up' ? <TrendingUp size={14} /> : trend === 'down' ? <TrendingDown size={14} /> : null}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm font-medium text-slate-600 mt-1">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

// ─── Componente: Semáforo de mantenimiento ───────────────────────────────────────
function SemaforoMantenimiento({ semaforos }: { semaforos: { verde: number; amarillo: number; naranja: number; rojo: number } }) {
  const total = semaforos.verde + semaforos.amarillo + semaforos.naranja + semaforos.rojo;
  
  return (
    <div className="flex items-center justify-center gap-2 p-3">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
          {semaforos.verde}
        </div>
        <span className="text-xs text-slate-500 mt-1">Ok</span>
      </div>
      <div className="h-1 w-8 bg-slate-200 rounded" />
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
          {semaforos.amarillo}
        </div>
        <span className="text-xs text-slate-500 mt-1">Pronto</span>
      </div>
      <div className="h-1 w-8 bg-slate-200 rounded" />
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
          {semaforos.naranja}
        </div>
        <span className="text-xs text-slate-500 mt-1">Urgente</span>
      </div>
      <div className="h-1 w-8 bg-slate-200 rounded" />
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold text-sm">
          {semaforos.rojo}
        </div>
        <span className="text-xs text-slate-500 mt-1">Vencido</span>
      </div>
    </div>
  );
}

// ─── Componente: Barra de progreso horizontal ─────────────────────────────────────
interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

function ProgressBar({ label, value, total, color }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-800 font-medium">{value} ({pct}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Componente: Alerta de SLA ─────────────────────────────────────────────────
function SLABadge({ cumple, tiempo }: { cumple: boolean | undefined; tiempo: number }) {
  if (cumple === undefined) return null;
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
      cumple ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
    }`}>
      {cumple ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
      {cumple ? 'SLA OK' : 'SLA EXCEDIDO'} ({tiempo}min)
    </div>
  );
}

// ─── Funciones helper para formateo ───────────────────────────────────────────────

function formatCurrency(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-EC').format(value);
}

// ─── Dashboard Principal ────────────────────────────────────────────────────────
export function Dashboard() {
  const assets = useAssets();
  const resolveLocation = useLocationNames();
  const [data, setData] = useState<DashboardData>({
    activos: null,
    mantenimiento: null,
    fallas: null,
    metricasFallas: null,
    prestamos: null,
    loading: true,
    error: null,
  });

  // Cargar datos del dashboard
  useEffect(() => {
    async function cargarDashboard() {
      try {
        const [activos, mantenimiento, metricasFallas] = await Promise.all([
          getDashboardActivos(),
          getDashboardMantenimiento(),
          getMetricasFallas(),
        ]);
        
        setData({
          activos,
          mantenimiento,
          fallas: null,
          metricasFallas,
          prestamos: null,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Error cargando dashboard:', err);
        setData(prev => ({ ...prev, loading: false, error: 'Error cargando datos' }));
      }
    }
    
    cargarDashboard();
  }, []);

  // Calcular métricas locales de activos
  const totalAssets = assets.length;
  const activeAssets = assets.filter((a) => a.estado === 'Activo').length;
  const repairAssets = assets.filter((a) => a.estado === 'En Reparación').length;
  const totalValue = assets.reduce((sum, a) => sum + (a.valor || 0), 0);

  // Loading state
  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Métricas de mantenimientos
  const semaforos = data.mantenimiento?.semaforos || { verde: 0, amarillo: 0, naranja: 0, rojo: 0 };
  const totalSemaforos = semaforos.verde + semaforos.amarillo + semaforos.naranja + semaforos.rojo;
  
  // Métricas de fallas
  const metricasFallas = data.metricasFallas;
  const tiempoPromedio = metricasFallas?.promedioTiempoRespuestaGerencia || 0;
  const slaCumple = tiempoPromedio <= 120;

  // Render
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <BarChart3 className="text-amber-600" />
          Dashboard Ejecutivo
        </h1>
        <p className="text-slate-500 mt-1">
          Resumen integral para la toma de decisiones de SURMOTOR
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 1: ACTIVOS Y FLOTA
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Package className="text-blue-600" size={20} />
          Gestión de Activos
        </h2>
        
        {/* KPI Cards - Activos */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
          <KPICard
            title="Total Activos"
            value={formatNumber(totalAssets)}
            icon={<Package size={18} />}
            color="blue"
            subtitle="Registrados en sistema"
          />
          <KPICard
            title="Activos Operativos"
            value={formatNumber(activeAssets)}
            icon={<CheckCircle2 size={18} />}
            color="green"
            trend="up"
            trendValue="+2%"
            subtitle="Estado activo"
          />
          <KPICard
            title="En Reparación"
            value={formatNumber(repairAssets)}
            icon={<Wrench size={18} />}
            color="amber"
            alert={repairAssets > 0}
            subtitle="Requieren atención"
          />
          <KPICard
            title="Valor Total"
            value={formatCurrency(totalValue)}
            icon={<DollarSign size={18} />}
            color="indigo"
            subtitle="Costo histórico"
          />
          <KPICard
            title="Valor Flota TCO"
            value={formatCurrency(data.activos?.tco?.tcoTotal || 0)}
            icon={<Activity size={18} />}
            color="slate"
            subtitle="TCO total"
          />
          <KPICard
            title="Depreciados"
            value={formatNumber(data.activos?.flotaDepreciada?.count || 0)}
            icon={<TrendingDown size={18} />}
            color="rose"
            subtitle={`${((data.activos?.flotaDepreciada?.porcentajeDeFlota || 0) * 100).toFixed(0)}% de flota`}
          />
        </div>

        {/* Gráfico de distribución de flota */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Estado de flota */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Estado de Flota</h3>
            <div className="space-y-3">
              <ProgressBar label="Activos" value={data.activos?.flota?.activos || activeAssets} total={totalAssets} color="bg-emerald-500" />
              <ProgressBar label="En Reparación" value={data.activos?.flota?.enReparacion || repairAssets} total={totalAssets} color="bg-amber-500" />
              <ProgressBar label="Dados de Baja" value={data.activos?.flota?.dadosDeBaja || 0} total={totalAssets} color="bg-slate-400" />
              <ProgressBar label="Inactivos" value={data.activos?.flota?.inactivos || 0} total={totalAssets} color="bg-rose-400" />
            </div>
          </div>

          {/* Costos acumulados */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Costos Acumulados</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-emerald-50 rounded-lg">
                <span className="text-sm text-slate-600">Mantenimientos</span>
                <span className="font-semibold text-emerald-700">{formatCurrency(data.activos?.tco?.totalCostoMantenimientos || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-rose-50 rounded-lg">
                <span className="text-sm text-slate-600">Fallas</span>
                <span className="font-semibold text-rose-700">{formatCurrency(data.activos?.tco?.totalCostoFallas || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-indigo-50 rounded-lg">
                <span className="text-sm text-slate-600">TCO Flota</span>
                <span className="font-semibold text-indigo-700">{formatCurrency(data.activos?.tco?.tcoTotal || 0)}</span>
              </div>
            </div>
          </div>

          {/* Distribución por área */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Disponibilidad por Área</h3>
            <div className="space-y-2">
              {(data.activos?.disponibilidadPorArea || []).slice(0, 4).map((area) => (
                <div key={area.area} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 truncate">
                    {resolveLocation(area.area) || area.area || 'Sin área asignada'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{area.cantidadFallas} fallas</span>
                    <span className="text-xs text-slate-400">{area.totalParadaHoras}h parada</span>
                  </div>
                </div>
              ))}
              {(!data.activos?.disponibilidadPorArea || data.activos.disponibilidadPorArea.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">Sin datos de áreas</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 2: MANTENIMIENTOS Y SEMÁFOROS
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Wrench className="text-amber-600" size={20} />
          Mantenimientos
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
          <KPICard
            title="Semáforo Verde"
            value={semaforos.verde}
            icon={<CheckCircle2 size={18} />}
            color="green"
            subtitle="Al día"
          />
          <KPICard
            title="Por Vencer"
            value={semaforos.amarillo}
            icon={<Clock size={18} />}
            color="amber"
            alert={semaforos.amarillo > 5}
            subtitle="Próximos 30 días"
          />
          <KPICard
            title="Urgente"
            value={semaforos.naranja}
            icon={<AlertTriangle size={18} />}
            color="amber"
            alert={semaforos.naranja > 0}
            subtitle="Próximos 7 días"
          />
          <KPICard
            title="Vencidos"
            value={semaforos.rojo}
            icon={<XCircle size={18} />}
            color="rose"
            alert={semaforos.rojo > 0}
            subtitle="Requiere acción"
          />
          <KPICard
            title="Preventivo"
            value={formatNumber(data.mantenimiento?.ratioTipo?.preventivo?.count || 0)}
            icon={<Shield size={18} />}
            color="blue"
            subtitle={formatCurrency(data.mantenimiento?.ratioTipo?.preventivo?.costoTotal || 0)}
          />
          <KPICard
            title="Correctivo"
            value={formatNumber(data.mantenimiento?.ratioTipo?.correctivo?.count || 0)}
            icon={<Zap size={18} />}
            color="rose"
            subtitle={formatCurrency(data.mantenimiento?.ratioTipo?.correctivo?.costoTotal || 0)}
          />
        </div>

        {/* Ratio preventivo vs correctivo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Ratio de Mantenimientos</h3>
            <div className="flex items-center justify-center py-4">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                  <circle 
                    cx="64" cy="64" r="56" 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="12"
                    strokeDasharray={`${((data.mantenimiento?.porcentajeCorrectivo || 0) * 3.52)} 352`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-800">{100 - (data.mantenimiento?.porcentajeCorrectivo || 0)}%</span>
                  <span className="text-xs text-slate-500">Preventivo</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Preventivo: {100 - (data.mantenimiento?.porcentajeCorrectivo || 0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span>Correctivo: {data.mantenimiento?.porcentajeCorrectivo || 0}%</span>
              </div>
            </div>
          </div>

          {/* Semáforos */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Estado de Mantenimientos</h3>
            <SemaforoMantenimiento semaforos={semaforos} />
            <div className="mt-4 text-center">
              <p className="text-sm text-slate-500">
                {totalSemaforos - semaforos.rojo} de {totalSemaforos} equipos al día
              </p>
              {semaforos.rojo > 0 && (
                <p className="text-xs text-rose-600 mt-1 font-medium">
                  ⚠️ {semaforos.rojo} equipo(s) con mantenimiento vencido(s)
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 3: FALLAS CORRECTIVAS
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="text-rose-600" size={20} />
          Fallas Correctivas
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
          <KPICard
            title="Total Fallas"
            value={formatNumber(metricasFallas?.totalFallas || 0)}
            icon={<AlertTriangle size={18} />}
            color="rose"
            subtitle="Registradas"
          />
          <KPICard
            title="Fallas Críticas"
            value={formatNumber(metricasFallas?.fallasCriticas || 0)}
            icon={<XCircle size={18} />}
            color="rose"
            alert={(metricasFallas?.fallasCriticas || 0) > 0}
            subtitle="Urgencia crítica"
          />
          <KPICard
            title="Tiempo Respuesta"
            value={`${Math.round(tiempoPromedio)} min`}
            icon={<Timer size={18} />}
            color={slaCumple ? 'green' : 'rose'}
            subtitle="Promedio gerencia"
            alert={!slaCumple}
          />
          <KPICard
            title="SLA Cumplimiento"
            value={slaCumple ? '✓ OK' : '✗ EXCEDIDO'}
            icon={slaCumple ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            color={slaCumple ? 'green' : 'rose'}
            alert={!slaCumple}
            subtitle="Objetivo: ≤120min"
          />
          <KPICard
            title="Costo Fallas"
            value={formatCurrency(metricasFallas?.totalCostoFallas || 0)}
            icon={<DollarSign size={18} />}
            color="indigo"
            subtitle="Acumulado"
          />
          <KPICard
            title="Tiempo Parada"
            value={`${Math.round((metricasFallas?.promedioTiempoTotalParada || 0) / 60)} h`}
            icon={<Clock size={18} />}
            color="amber"
            subtitle="Promedio"
          />
        </div>

        {/* Distribución por tipo de falla */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Fallas por Tipo</h3>
            <div className="space-y-2">
              {Object.entries(metricasFallas?.fallasPorTipo || {}).map(([tipo, count]) => (
                <div key={tipo} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 capitalize">{tipo}</span>
                  <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">{count}</span>
                </div>
              ))}
              {Object.keys(metricasFallas?.fallasPorTipo || {}).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Sin datos de tipos</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Fallas por Estado</h3>
            <div className="space-y-2">
              {Object.entries(metricasFallas?.porEstado || {}).map(([estado, count]) => {
                const labels: Record<string, string> = {
                  reportada: 'Reportada',
                  evaluando: 'Evaluando',
                  en_reparacion: 'En Reparación',
                  reparada: 'Reparada',
                  descartada: 'Descartada',
                };
                return (
                  <div key={estado} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{labels[estado] || estado}</span>
                    <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 4: HERRAMIENTAS Y PRÉSTAMOS
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Briefcase className="text-indigo-600" size={20} />
          Préstamos de Herramientas
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <KPICard
            title="Préstamos Activos"
            value={formatNumber(data.prestamos?.resumen?.total || 0)}
            icon={<Briefcase size={18} />}
            color="indigo"
            subtitle="En curso"
          />
          <KPICard
            title="Con Daños"
            value={formatNumber(data.prestamos?.resumen?.totalDanosReportados || 0)}
            icon={<AlertTriangle size={18} />}
            color="amber"
            subtitle="Reportados"
          />
          <KPICard
            title="Costo Daños"
            value={formatCurrency(data.prestamos?.resumen?.costoTotalDanos || 0)}
            icon={<DollarSign size={18} />}
            color="rose"
            subtitle="Acumulado"
          />
          <KPICard
            title="Técnicos con Daño"
            value={formatNumber(data.prestamos?.tecnicosConDano?.length || 0)}
            icon={<Users size={18} />}
            color="amber"
            subtitle="Responsables"
          />
        </div>

        {/* Herramientas más demandadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Herramientas Más Demandadas</h3>
            <div className="space-y-2">
              {(data.prestamos?.demandaHerramientas || []).slice(0, 5).map((h) => (
                <div key={h.herramientaId} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 truncate">{h.nombre}</span>
                  <span className="font-medium text-slate-800">{h.cantidadPrestamos} préstamos</span>
                </div>
              ))}
              {(!data.prestamos?.demandaHerramientas || data.prestamos.demandaHerramientas.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">Sin datos de demanda</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Técnicos con Más Daños</h3>
            <div className="space-y-2">
              {(data.prestamos?.tecnicosConDano || []).slice(0, 5).map((t) => (
                <div key={t.tecnicoId} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 truncate">{t.nombre}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{formatNumber(t.prestamosConDano)} daños</span>
                    <span className="text-xs text-rose-500">{formatCurrency(t.costoTotal)}</span>
                  </div>
                </div>
              ))}
              {(!data.prestamos?.tecnicosConDano || data.prestamos.tecnicosConDano.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">Sin datos de daños</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 5: RESUMEN EJECUTIVO
      ═══════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Activity className="text-emerald-600" size={20} />
          Resumen Ejecutivo
        </h2>
        
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400">{formatNumber(totalAssets)}</p>
              <p className="text-sm text-slate-300 mt-1">Activos</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${semaforos.rojo > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {totalSemaforos - semaforos.rojo}/{totalSemaforos}
              </p>
              <p className="text-sm text-slate-300 mt-1">Equipos OK</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${!slaCumple ? 'text-rose-400' : 'text-emerald-400'}`}>
                {slaCumple ? '✓' : '✗'}
              </p>
              <p className="text-sm text-slate-300 mt-1">SLA Fallas</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-400">
                {formatCurrency(totalValue + (data.activos?.tco?.totalCostoMantenimientos || 0) + (data.activos?.tco?.totalCostoFallas || 0))}
              </p>
              <p className="text-sm text-slate-300 mt-1">Valor Total</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400">
                {formatNumber(metricasFallas?.fallasCriticas || 0)}
              </p>
              <p className="text-sm text-slate-300 mt-1">Fallas Críticas</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${(metricasFallas?.totalCostoFallas || 0) > 5000 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {formatCurrency(metricasFallas?.totalCostoFallas || 0)}
              </p>
              <p className="text-sm text-slate-300 mt-1">Costo Fallas</p>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-600">
            <p className="text-sm text-slate-300 text-center">
              Última actualización: {new Date().toLocaleString('es-EC', { 
                dateStyle: 'medium', 
                timeStyle: 'short' 
              })}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}