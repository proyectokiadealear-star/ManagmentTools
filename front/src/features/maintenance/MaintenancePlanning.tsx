import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Bell,
  Wrench,
  ChevronDown,
  ChevronUp,
  Camera,
  PlayCircle,
  FileText,
  ClipboardList,
  Plus,
  Eye,
} from 'lucide-react';
import {
  MantenimientoPreventivo,
  FallaCorrectiva,
  mockMantenimientos,
  mockFallasCorrectivas,
  SemaforoEstado,
  CotizacionRegistro,
  mockCotizaciones,
} from '../../data/mockData';
import { useAssets, useRole } from '@shared/context/AssetContext';
import { QuotationModal } from './QuotationModal';
import { RegistrarFallaModal } from './RegistrarFallaModal';

const semaforoConfig: Record<SemaforoEstado, { label: string; dot: string; bg: string; text: string; border: string }> = {
  verde: {
    label: 'Al día',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  amarillo: {
    label: 'Próximo',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  rojo: {
    label: 'Vencido',
    dot: 'bg-rose-500',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

const estadoFallaConfig: Record<FallaCorrectiva['estado'], { bg: string; text: string }> = {
  'Pendiente Autorización': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'En Reparación': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Resuelto': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

export function MaintenancePlanning() {
  const assets = useAssets();
  const role = useRole();
  const [activeTab, setActiveTab] = useState<'cronograma' | 'fallas' | 'cotizaciones'>('cronograma');
  const [mantenimientos, setMantenimientos] = useState<MantenimientoPreventivo[]>(mockMantenimientos);
  const [fallas, setFallas] = useState<FallaCorrectiva[]>(mockFallasCorrectivas);
  const [expandedFalla, setExpandedFalla] = useState<string | null>(null);

  // Modal nueva falla
  const [isAddFallaOpen, setIsAddFallaOpen] = useState(false);
  const [newFalla, setNewFalla] = useState<Partial<FallaCorrectiva>>({
    tipoCausa: 'Mecánica',
    estado: 'Pendiente Autorización',
    tiempoParada: 0,
    costoReparacion: 0,
  });

  // Cotizaciones (F5.1 / F5.2) — solo para jefe
  const [cotizaciones, setCotizaciones] = useState<CotizacionRegistro[]>(mockCotizaciones);
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);
  const [selectedCotizacion, setSelectedCotizacion] = useState<CotizacionRegistro | null>(null);

  const handleSaveCotizacion = (cotizacion: CotizacionRegistro) => {
    setCotizaciones((prev) => {
      const idx = prev.findIndex((c) => c.id === cotizacion.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = cotizacion;
        return updated;
      }
      return [cotizacion, ...prev];
    });
    setIsQuotationOpen(false);
    setSelectedCotizacion(null);
  };

  const handleSelectGanadora = (cotizacionId: string, proformaId: string) => {
    setCotizaciones((prev) =>
      prev.map((c) => {
        if (c.id !== cotizacionId) return c;
        return {
          ...c,
          estado: 'Aprobada',
          proformas: c.proformas.map((p) => ({ ...p, seleccionada: p.id === proformaId })),
        };
      })
    );
    setIsQuotationOpen(false);
    setSelectedCotizacion(null);
  };

  // KPIs semáforo
  const vencidos = mantenimientos.filter((m) => m.estado === 'rojo').length;
  const proximos = mantenimientos.filter((m) => m.estado === 'amarillo').length;
  const alDia = mantenimientos.filter((m) => m.estado === 'verde').length;
  const pendientesAutorizacion = fallas.filter((f) => f.estado === 'Pendiente Autorización').length;

  // KPI tiempo respuesta gerencia
  const fallasConAutorizacion = fallas.filter((f) => f.horasEsperaAutorizacion !== null);
  const promedioHorasAutorizacion =
    fallasConAutorizacion.length > 0
      ? Math.round(fallasConAutorizacion.reduce((s, f) => s + (f.horasEsperaAutorizacion ?? 0), 0) / fallasConAutorizacion.length)
      : 0;

  const handleMarcarEjecutado = (id: string) => {
    setMantenimientos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ejecutado: true, estado: 'verde', diasRestantes: 180 } : m))
    );
  };

  // Note: falla authorization now happens via the Cotizaciones tab (F5.1/F5.2)

  const handleSaveFalla = (e: React.FormEvent) => {
    e.preventDefault();
    const falla: FallaCorrectiva = {
      id: `FC${String(fallas.length + 1).padStart(3, '0')}`,
      assetId: 'A000',
      assetDescripcion: newFalla.assetDescripcion || 'Activo no especificado',
      fechaFalla: new Date().toISOString().split('T')[0],
      descripcionFalla: newFalla.descripcionFalla || '',
      tipoCausa: newFalla.tipoCausa as FallaCorrectiva['tipoCausa'],
      tiempoParada: newFalla.tiempoParada || 0,
      fechaSolicitudAutorizacion: new Date().toISOString().split('T')[0],
      fechaAutorizacion: null,
      horasEsperaAutorizacion: null,
      costoReparacion: newFalla.costoReparacion || 0,
      proveedor: newFalla.proveedor || '',
      tecnico: newFalla.tecnico || '',
      estado: 'Pendiente Autorización',
      proformas: [],
    };
    setFallas((prev) => [falla, ...prev]);
    setIsAddFallaOpen(false);
    setNewFalla({ tipoCausa: 'Mecánica', estado: 'Pendiente Autorización', tiempoParada: 0, costoReparacion: 0 });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planificación Oportuna</h1>
          <p className="text-slate-500 mt-1">Mantenimientos preventivos, alertas y registro de fallas correctivas</p>
        </div>
        {(role === 'tecnico') && (
          <button
            onClick={() => setIsAddFallaOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors shadow-sm"
          >
            <AlertTriangle size={16} />
            Registrar Falla Correctiva
          </button>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-1">Vencidos</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
            <p className="text-3xl font-bold text-rose-700">{vencidos}</p>
          </div>
          <p className="text-xs text-rose-500 mt-1">Mantenimientos atrasados</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Próximos</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
            <p className="text-3xl font-bold text-amber-700">{proximos}</p>
          </div>
          <p className="text-xs text-amber-500 mt-1">Menos de 30 días</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Al Día</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <p className="text-3xl font-bold text-emerald-700">{alDia}</p>
          </div>
          <p className="text-xs text-emerald-500 mt-1">Sin alertas activas</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={`rounded-xl p-4 border ${pendientesAutorizacion > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${pendientesAutorizacion > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
            Pend. Autorización
          </p>
          <p className={`text-3xl font-bold ${pendientesAutorizacion > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
            {pendientesAutorizacion}
          </p>
          <p className={`text-xs mt-1 ${pendientesAutorizacion > 0 ? 'text-amber-500' : 'text-slate-400'}`}>Fallas correctivas</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-lg w-fit mb-8">
        <button
          onClick={() => setActiveTab('cronograma')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'cronograma' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <CalendarClock size={16} />
          Cronograma Preventivo (F4.1 / F4.2)
        </button>
        <button
          onClick={() => setActiveTab('fallas')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'fallas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <AlertTriangle size={16} />
          Fallas Correctivas (F6.1 / F6.2)
          {pendientesAutorizacion > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendientesAutorizacion}
            </span>
          )}
        </button>
        {role === 'jefe' && (
          <button
            onClick={() => setActiveTab('cotizaciones')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'cotizaciones' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <ClipboardList size={16} />
            Cotizaciones (F5.1 / F5.2)
            {cotizaciones.length > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                {cotizaciones.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ─── TAB: CRONOGRAMA ─────────────────────────────────────────── */}
      {activeTab === 'cronograma' && (
        <div className="space-y-4">
          {/* F4.2 — Banner de alerta si hay vencidos */}
          {vencidos > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4"
            >
              <Bell size={20} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-700 text-sm">
                  {vencidos} mantenimiento{vencidos > 1 ? 's' : ''} vencido{vencidos > 1 ? 's' : ''} — acción requerida
                </p>
                <p className="text-xs text-rose-500 mt-0.5">
                  Equipos críticos superaron su fecha de mantenimiento. Coordina la ejecución lo antes posible.
                </p>
              </div>
            </motion.div>
          )}

          {/* Leyenda semáforo */}
          <div className="flex flex-wrap gap-3 text-xs font-medium">
            {(['rojo', 'amarillo', 'verde'] as SemaforoEstado[]).map((s) => (
              <span key={s} className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${semaforoConfig[s].bg} ${semaforoConfig[s].text} border ${semaforoConfig[s].border}`}>
                <span className={`w-2 h-2 rounded-full ${semaforoConfig[s].dot}`} />
                {semaforoConfig[s].label}
              </span>
            ))}
            <span className="text-slate-400">• Verde: &gt;30 días | Amarillo: 1–30 días | Rojo: vencido</span>
          </div>

          {/* Tabla cronograma */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <CalendarClock size={18} className="text-blue-600" />
              <h2 className="font-bold text-slate-900">Cronograma de Mantenimientos Preventivos</h2>
              <span className="ml-auto text-xs text-slate-400">F4.1 — Alertas semáforo</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-medium">Estado</th>
                    <th className="px-5 py-3 font-medium">Activo</th>
                    <th className="px-5 py-3 font-medium">Tipo / Periodicidad</th>
                    <th className="px-5 py-3 font-medium">Último</th>
                    <th className="px-5 py-3 font-medium">Próximo</th>
                    <th className="px-5 py-3 font-medium">Responsable</th>
                    <th className="px-5 py-3 font-medium text-center">Días</th>
                    {role !== 'personal' && <th className="px-5 py-3 font-medium">Observación</th>}
                    {(role === 'personal' || role === 'tecnico') && <th className="px-5 py-3 font-medium text-center">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...mantenimientos]
                    .sort((a, b) => a.diasRestantes - b.diasRestantes)
                    .map((m) => {
                      const cfg = semaforoConfig[m.estado];
                      return (
                        <motion.tr
                          key={m.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`hover:bg-slate-50/50 transition-colors ${m.ejecutado ? 'opacity-60' : ''}`}
                        >
                          <td className="px-5 py-4">
                            <span className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text} border ${cfg.border} w-fit`}>
                              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                              {m.ejecutado ? 'Ejecutado' : cfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-900">{m.assetDescripcion}</p>
                            <p className="text-xs text-slate-400">{m.assetId}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-slate-700">{m.tipo}</p>
                            <p className="text-xs text-slate-400">{m.periodicidad}</p>
                          </td>
                          <td className="px-5 py-4 font-mono text-slate-600 text-xs">{m.ultimoMantenimiento}</td>
                          <td className="px-5 py-4 font-mono text-slate-600 text-xs">{m.proximoMantenimiento}</td>
                          <td className="px-5 py-4 text-slate-700 text-sm">{m.responsable}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`font-bold text-sm ${m.diasRestantes < 0 ? 'text-rose-600' : m.diasRestantes < 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {m.diasRestantes < 0 ? `${Math.abs(m.diasRestantes)}d atrás` : `+${m.diasRestantes}d`}
                            </span>
                          </td>
                          {role !== 'personal' && (
                            <td className="px-5 py-4 text-xs text-slate-500 max-w-[180px]">{m.observacion || '—'}</td>
                          )}
                          {(role === 'personal' || role === 'tecnico') && (
                            <td className="px-5 py-4 text-center">
                              {!m.ejecutado ? (
                                <button
                                  onClick={() => handleMarcarEjecutado(m.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors mx-auto"
                                >
                                  <PlayCircle size={13} />
                                  Ejecutar
                                </button>
                              ) : (
                                <CheckCircle2 size={18} className="text-emerald-400 mx-auto" />
                              )}
                            </td>
                          )}
                        </motion.tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── TAB: FALLAS ─────────────────────────────────────────────── */}
      {activeTab === 'fallas' && (
        <div className="space-y-6">
          {/* F6.2 — KPI tiempo de respuesta (visible para Jefe) */}
          {role === 'jefe' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tiempo Prom. Autorización</p>
                <p className="text-3xl font-bold text-slate-900">{promedioHorasAutorizacion}h</p>
                <p className="text-xs text-slate-400 mt-1">Promedio de respuesta gerencia</p>
              </div>
              <div className={`border rounded-xl p-5 shadow-sm ${pendientesAutorizacion > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${pendientesAutorizacion > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  Pendientes de Aprobación
                </p>
                <p className={`text-3xl font-bold ${pendientesAutorizacion > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {pendientesAutorizacion}
                </p>
                <p className={`text-xs mt-1 ${pendientesAutorizacion > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  Fallas esperando tu decisión
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Fallas Registradas</p>
                <p className="text-3xl font-bold text-slate-900">{fallas.length}</p>
                <p className="text-xs text-slate-400 mt-1">En el período actual</p>
              </div>
            </motion.div>
          )}

          {/* Lista de fallas */}
          <div className="space-y-4">
            {fallas.map((falla) => {
              const isExpanded = expandedFalla === falla.id;
              const estadoCfg = estadoFallaConfig[falla.estado];
              const isPendiente = falla.estado === 'Pendiente Autorización';
              return (
                <motion.div
                  key={falla.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isPendiente ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}
                >
                  {/* Header falla */}
                  <div
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedFalla(isExpanded ? null : falla.id)}
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900">{falla.assetDescripcion}</h3>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${estadoCfg.bg} ${estadoCfg.text}`}>
                          {falla.estado}
                        </span>
                        {isPendiente && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                            <Clock size={10} /> Esperando autorización
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-1">{falla.descripcionFalla}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><CalendarClock size={12} /> {falla.fechaFalla}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> Parada: {falla.tiempoParada}h</span>
                        <span className="flex items-center gap-1"><Wrench size={12} /> {falla.tipoCausa}</span>
                        {falla.costoReparacion > 0 && (
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            ${falla.costoReparacion.toLocaleString('es-EC')} costo
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {isPendiente && role === 'jefe' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveTab('cotizaciones'); }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <FileText size={14} />
                          Gestionar Proformas
                        </button>
                      )}
                      <div className="p-1.5 text-slate-400 bg-slate-100 rounded-full">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Detalle expandido */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 bg-slate-50/50"
                      >
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Descripción y solución */}
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Descripción completa</p>
                              <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                                {falla.descripcionFalla}
                              </p>
                            </div>
                            {falla.solucion && (
                              <div>
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Solución aplicada</p>
                                <p className="text-sm text-slate-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200 leading-relaxed">
                                  {falla.solucion}
                                </p>
                              </div>
                            )}
                            {falla.evidenciaFoto && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                  <Camera size={12} /> Evidencia fotográfica
                                </p>
                                <img
                                  src={falla.evidenciaFoto}
                                  alt="Evidencia"
                                  className="w-full h-32 object-cover rounded-lg border border-slate-200"
                                />
                              </div>
                            )}
                          </div>

                          {/* Trazabilidad autorización (F5.2 / F6.2) */}
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                Trazabilidad de Autorización
                              </p>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm bg-white p-2 rounded border border-slate-200">
                                  <span className="text-slate-500">Técnico</span>
                                  <span className="font-medium text-slate-900">{falla.tecnico}</span>
                                </div>
                                <div className="flex justify-between text-sm bg-white p-2 rounded border border-slate-200">
                                  <span className="text-slate-500">Proveedor</span>
                                  <span className="font-medium text-slate-900">{falla.proveedor || '—'}</span>
                                </div>
                                <div className="flex justify-between text-sm bg-white p-2 rounded border border-slate-200">
                                  <span className="text-slate-500">Solicitud enviada</span>
                                  <span className="font-medium text-slate-900">{falla.fechaSolicitudAutorizacion}</span>
                                </div>
                                <div className={`flex justify-between text-sm p-2 rounded border ${falla.fechaAutorizacion ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                  <span className={falla.fechaAutorizacion ? 'text-emerald-600' : 'text-amber-600'}>
                                    Autorización recibida
                                  </span>
                                  <span className={`font-medium ${falla.fechaAutorizacion ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {falla.fechaAutorizacion ?? 'Pendiente'}
                                  </span>
                                </div>
                                {falla.horasEsperaAutorizacion !== null && (
                                  <div className={`flex justify-between text-sm p-2 rounded border ${falla.horasEsperaAutorizacion > 48 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className={falla.horasEsperaAutorizacion > 48 ? 'text-rose-600 font-medium' : 'text-slate-500'}>
                                      Tiempo de espera
                                    </span>
                                    <span className={`font-bold ${falla.horasEsperaAutorizacion > 48 ? 'text-rose-700' : 'text-slate-700'}`}>
                                      {falla.horasEsperaAutorizacion}h
                                      {falla.horasEsperaAutorizacion > 48 && ' ⚠️'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB: COTIZACIONES (F5.1 / F5.2) — solo jefe ──────────────── */}
      {activeTab === 'cotizaciones' && role === 'jefe' && (
        <div className="space-y-6">
          {/* Header + botón nueva cotización */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Gestión de Cotizaciones y Proformas</h2>
              <p className="text-sm text-slate-500 mt-0.5">Registra ≥3 proformas por trabajo y selecciona la oferta ganadora (F5.1 / F5.2)</p>
            </div>
            <button
              onClick={() => { setSelectedCotizacion(null); setIsQuotationOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Nueva Cotización
            </button>
          </div>

          {/* Empty state */}
          {cotizaciones.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 flex flex-col items-center gap-4 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                <ClipboardList size={28} className="text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-700 text-lg">No hay cotizaciones registradas</p>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">
                  Crea una nueva cotización para un activo, elige el tipo de trabajo y carga al menos 3 proformas de proveedores.
                </p>
              </div>
              <button
                onClick={() => { setSelectedCotizacion(null); setIsQuotationOpen(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Crear primera cotización
              </button>
            </motion.div>
          )}

          {/* Lista de cotizaciones */}
          {cotizaciones.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <ClipboardList size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-900">Cotizaciones registradas</h3>
                <span className="ml-auto text-xs text-slate-400">{cotizaciones.length} registro{cotizaciones.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 font-medium">Estado</th>
                      <th className="px-5 py-3 font-medium">Activo</th>
                      <th className="px-5 py-3 font-medium">Tipo</th>
                      <th className="px-5 py-3 font-medium">Descripción</th>
                      <th className="px-5 py-3 font-medium text-center">Proformas</th>
                      <th className="px-5 py-3 font-medium">Fecha</th>
                      <th className="px-5 py-3 font-medium text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cotizaciones.map((cot) => {
                      const proformaGanadora = cot.proformas.find((p) => p.seleccionada);
                      const estadoStyle =
                        cot.estado === 'Aprobada'
                          ? 'bg-emerald-100 text-emerald-700'
                          : cot.estado === 'Completa'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700';
                      return (
                        <motion.tr
                          key={cot.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${estadoStyle}`}>
                              {cot.estado}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-900">{cot.assetDescripcion}</p>
                            <p className="text-xs text-slate-400">{cot.assetId}</p>
                          </td>
                          <td className="px-5 py-4 text-slate-700">{cot.tipo}</td>
                          <td className="px-5 py-4 text-slate-600 max-w-[200px] truncate">{cot.descripcionTrabajo}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`font-bold text-sm ${cot.proformas.length >= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {cot.proformas.length}
                            </span>
                            {cot.proformas.length < 3 && (
                              <span className="ml-1 text-xs text-amber-500">(mín. 3)</span>
                            )}
                          </td>
                          <td className="px-5 py-4 font-mono text-slate-500 text-xs">{cot.fechaRegistro}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 justify-center">
                              <button
                                onClick={() => { setSelectedCotizacion(cot); setIsQuotationOpen(true); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Eye size={12} />
                                {cot.estado === 'Aprobada' ? 'Ver' : 'Gestionar'}
                              </button>
                              {proformaGanadora && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                  ✓ {proformaGanadora.proveedor}
                                </span>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: QuotationModal — cotizaciones y proformas (F5.1/F5.2) ─── */}
      <AnimatePresence>
        {isQuotationOpen && (
          <QuotationModal
            cotizacion={selectedCotizacion ?? undefined}
            assets={assets}
            onClose={() => { setIsQuotationOpen(false); setSelectedCotizacion(null); }}
            onSave={handleSaveCotizacion}
            onSelectGanadora={handleSelectGanadora}
          />
        )}
      </AnimatePresence>

      {/* ─── MODAL: Registrar Falla ─── */}
      <RegistrarFallaModal
        isOpen={isAddFallaOpen}
        onClose={() => setIsAddFallaOpen(false)}
        onSave={handleSaveFalla}
        newFalla={newFalla}
        setNewFalla={setNewFalla}
      />
    </div>
  );
}
