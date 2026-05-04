/**
 * CorrectiveFailuresView.tsx
 * 
 * Vista de gestión de fallas correctivas con:
 * - Dashboard de métricas (tiempos, costos, SLA)
 * - Lista de fallas por estado
 * - Registro de tiempos de respuesta de gerencia
 * - Cierre con costos, causa raíz y aprendizajes
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, Clock, DollarSign, CheckCircle2, 
  X, Wrench, Package, Activity, Filter, Search,
  ChevronRight, AlertCircle, Lightbulb, TrendingDown
} from 'lucide-react';
import { 
  FallaCorrectiva, getFallas, updateFalla, getMetricasFallas,
  MetricasFallas, EstadoFalla, DecisionFalla
} from '../../services/assetService';
import { useAssets } from '@shared/context/AssetContext';

// ─── Tarjeta de Métrica ─────────────────────────────────────────────────────────
function MetricCard({ 
  title, value, subtitle, icon, color, trend 
}: { 
  title: string; value: string | number; subtitle?: string; 
  icon: React.ReactNode; color: string; trend?: 'up' | 'down' | 'neutral' 
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">{title}</span>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-slate-800">{value}</span>
        {trend && (
          <span className={`text-xs ${trend === 'up' ? 'text-rose-500' : trend === 'down' ? 'text-emerald-500' : 'text-slate-400'}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Modal de Cierre de Falla ───────────────────────────────────────────────────
function CerrarFallaModal({ 
  falla, isOpen, onClose, onSuccess 
}: { 
  falla: FallaCorrectiva | null; 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    causaRaiz: '',
    accionCorrectiva: '',
    costoRepuestos: '',
    costoManoObra: '',
    reparadoPor: '',
    tiempoReparacion: '',
    tipoFallaRepetida: false,
    sugerenciaPreventiva: '',
  });

  useEffect(() => {
    if (falla) {
      setForm({
        causaRaiz: falla.causaRaiz || '',
        accionCorrectiva: falla.accionCorrectiva || '',
        costoRepuestos: falla.costoRepuestos?.toString() || '',
        costoManoObra: falla.costoManoObra?.toString() || '',
        reparadoPor: falla.reparadoPor || '',
        tiempoReparacion: falla.tiempoReparacion ? Math.round(falla.tiempoReparacion / 60).toString() : '',
        tipoFallaRepetida: falla.tipoFallaRepetida || false,
        sugerenciaPreventiva: falla.sugerenciaPreventiva || '',
      });
    }
  }, [falla]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!falla) return;
    
    setSaving(true);
    try {
      const costoRep = parseFloat(form.costoRepuestos) || 0;
      const costoMano = parseFloat(form.costoManoObra) || 0;
      const tiempoRep = form.tiempoReparacion ? parseFloat(form.tiempoReparacion) * 60 : undefined;
      
      await updateFalla(falla.id, {
        estado: 'reparada',
        causaRaiz: form.causaRaiz,
        accionCorrectiva: form.accionCorrectiva,
        costoRepuestos: costoRep || undefined,
        costoManoObra: costoMano || undefined,
        reparadoPor: form.reparadoPor || undefined,
        tiempoReparacion: tiempoRep,
        fechaReparacion: new Date().toISOString(),
        tipoFallaRepetida: form.tipoFallaRepetida || undefined,
        sugerenciaPreventiva: form.sugerenciaPreventiva || undefined,
      });
      
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error cerrando falla:', err);
    } finally {
      setSaving(false);
    }
  }

  const totalCosto = (parseFloat(form.costoRepuestos) || 0) + (parseFloat(form.costoManoObra) || 0);

  return (
    <AnimatePresence>
      {isOpen && falla && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Cerrar Falla</h2>
                  <p className="text-xs text-slate-500">{falla.codigoFalla} · {falla.activoNombre}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <form id="cerrar-falla-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Tiempos registrados (solo lectura) */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h4 className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-2">
                    <Clock size={14} /> Tiempos registrados
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Detección → Reporte:</span>
                      <span className="ml-2 font-medium text-slate-700">{falla.tiempoDeteccionAReporte || 0} min</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Reporte → Respuesta:</span>
                      <span className={`ml-2 font-medium ${(falla.tiempoReporteARespuestaGerencia || 0) > 120 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {falla.tiempoReporteARespuestaGerencia || 0} min
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">SLA (≤ 2h):</span>
                      <span className={`ml-2 font-medium ${falla.slaCumple ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {falla.slaCumple ? 'CUMPLE' : 'EXCEDIDO'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Tiempo total parado:</span>
                      <span className="ml-2 font-medium text-slate-700">{falla.tiempoTotalParada ? Math.round(falla.tiempoTotalParada / 60) : '—'} h</span>
                    </div>
                  </div>
                </div>

                {/* Causa raíz y acción correctiva */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Causa raíz</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Ej: Fallo en capacitor de arranque"
                      value={form.causaRaiz}
                      onChange={e => setForm({ ...form, causaRaiz: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Acción correctiva</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Ej: Reemplazo de capacitor"
                      value={form.accionCorrectiva}
                      onChange={e => setForm({ ...form, accionCorrectiva: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Costos */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Costo repuestos ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="450.00"
                      value={form.costoRepuestos}
                      onChange={e => setForm({ ...form, costoRepuestos: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Costo mano de obra ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="200.00"
                      value={form.costoManoObra}
                      onChange={e => setForm({ ...form, costoManoObra: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Total costo */}
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                  <span className="text-sm font-medium text-emerald-700">Costo total de la falla:</span>
                  <span className="text-lg font-bold text-emerald-800">${totalCosto.toFixed(2)}</span>
                </div>

                {/* Tiempo de reparación y técnico */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Técnico que reparó</label>
                    <input
                      type="text"
                      placeholder="Nombre del técnico"
                      value={form.reparadoPor}
                      onChange={e => setForm({ ...form, reparadoPor: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tiempo reparación (horas)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="3"
                      value={form.tiempoReparacion}
                      onChange={e => setForm({ ...form, tiempoReparacion: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Análisis de aprendizaje */}
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="tipoFallaRepetida"
                      checked={form.tipoFallaRepetida}
                      onChange={e => setForm({ ...form, tipoFallaRepetida: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="tipoFallaRepetida" className="text-sm text-slate-700">
                      ¿Esta falla se ha repetido antes en este o similar equipo?
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      <Lightbulb size={12} className="inline mr-1" />
                      Sugerencia preventiva para evitar futuras fallas
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej: Programar revisión de capacitores en otros equipos similares"
                      value={form.sugerenciaPreventiva}
                      onChange={e => setForm({ ...form, sugerenciaPreventiva: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="cerrar-falla-form"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Cerrar Falla'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Vista Principal ─────────────────────────────────────────────────────────────
export function CorrectiveFailuresView() {
  const [fallas, setFallas] = useState<FallaCorrectiva[]>([]);
  const [metricas, setMetricas] = useState<MetricasFallas | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');
  const [fallaSeleccionada, setFallaSeleccionada] = useState<FallaCorrectiva | null>(null);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const assets = useAssets();

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    try {
      const [fallasData, metricasData] = await Promise.all([
        getFallas(filtroEstado || undefined),
        getMetricasFallas(),
      ]);
      setFallas(fallasData);
      setMetricas(metricasData);
    } catch (err) {
      console.error('Error cargando fallas:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado]);

  const fallasFiltradas = busqueda
    ? fallas.filter(f => 
        f.codigoFalla?.toLowerCase().includes(busqueda.toLowerCase()) ||
        f.activoNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        f.descripcionSintomas?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : fallas;

  const urgenciaColores: Record<string, string> = {
    critica: 'bg-rose-500',
    alta: 'bg-orange-500',
    media: 'bg-amber-500',
    baja: 'bg-emerald-500',
  };

  const estadoColores: Record<string, { bg: string; text: string; label: string }> = {
    reportada: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Reportada' },
    evaluando: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Evaluando' },
    en_reparacion: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En Reparación' },
    reparada: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Reparada' },
    descartada: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Descartada' },
  };

  function formatearTiempo(minutos?: number) {
    if (!minutos) return '—';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <AlertTriangle className="text-rose-500" />
            Fallas Correctivas
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de fallas y análisis de tiempos de respuesta</p>
        </div>
      </div>

      {/* Métricas */}
      {metricas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Fallas"
            value={metricas.totalFallas}
            icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
            color="bg-rose-100"
          />
          <MetricCard
            title="Fallas Críticas"
            value={metricas.fallasCriticas}
            subtitle={metricas.fallasCriticas > 0 ? 'requieren atención' : 'sin pendientes'}
            icon={<AlertCircle className="w-4 h-4 text-orange-600" />}
            color="bg-orange-100"
            trend={metricas.fallasCriticas > 0 ? 'up' : 'neutral'}
          />
          <MetricCard
            title="Tiempo Promedio Respuesta"
            value={`${Math.round(metricas.promedioTiempoRespuestaGerencia)} min`}
            subtitle="objetivo: 120 min"
            icon={<Clock className="w-4 h-4 text-blue-600" />}
            color="bg-blue-100"
            trend={metricas.promedioTiempoRespuestaGerencia > 120 ? 'up' : 'down'}
          />
          <MetricCard
            title="Costo Total Fallas"
            value={`$${metricas.totalCostoFallas.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`}
            subtitle="acumulado"
            icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
            color="bg-emerald-100"
          />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar fallas..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 w-64"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Todos los estados</option>
            <option value="reportada">Reportadas</option>
            <option value="evaluando">Evaluando</option>
            <option value="en_reparacion">En Reparación</option>
            <option value="reparada">Reparadas</option>
            <option value="descartada">Descartadas</option>
          </select>
        </div>
        <div className="text-sm text-slate-500">
          {fallasFiltradas.length} fallas encontradas
        </div>
      </div>

      {/* Lista de fallas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Código</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Activo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Síntoma</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Urgencia</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">T. Respuesta</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">SLA</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Costo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Acción</th>
              </tr>
            </thead>
            <tbody>
              {fallasFiltradas.map(falla => {
                const activo = assets.find(a => a.id === falla.activoId);
                return (
                  <tr key={falla.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-semibold text-indigo-600">{falla.codigoFalla || falla.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{falla.activoNombre}</p>
                        <p className="text-xs text-slate-400">{falla.activoCodigo}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600 max-w-xs truncate">{falla.descripcionSintomas}</p>
                    </td>
                    <td className="px-4 py-3">
                      {falla.urgencia && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${urgenciaColores[falla.urgencia]}`}>
                          {falla.urgencia}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColores[falla.estado]?.bg} ${estadoColores[falla.estado]?.text}`}>
                        {estadoColores[falla.estado]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${(falla.tiempoReporteARespuestaGerencia || 0) > 120 ? 'text-rose-600' : 'text-slate-600'}`}>
                        {formatearTiempo(falla.tiempoReporteARespuestaGerencia)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {falla.slaCumple !== undefined && (
                        <span className={`text-xs font-semibold ${falla.slaCumple ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {falla.slaCumple ? '✓' : '✗'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-700">
                        {falla.costoFalla ? `$${falla.costoFalla.toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {falla.estado !== 'reparada' && falla.estado !== 'descartada' && (
                        <button
                          onClick={() => {
                            setFallaSeleccionada(falla);
                            setShowCerrarModal(true);
                          }}
                          className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium"
                        >
                          Cerrar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {fallasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No se encontraron fallas</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de cierre */}
      <CerrarFallaModal
        falla={fallaSeleccionada}
        isOpen={showCerrarModal}
        onClose={() => {
          setShowCerrarModal(false);
          setFallaSeleccionada(null);
        }}
        onSuccess={cargarDatos}
      />
    </div>
  );
}