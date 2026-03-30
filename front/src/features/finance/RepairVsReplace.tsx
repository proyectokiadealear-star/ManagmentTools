import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Hammer,
  RefreshCw,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { Asset, FallaCorrectiva, mockFallasCorrectivas } from '../../data/mockData';
import { calcDepreciation } from '@shared/utils/depreciation';
import { useAssets, useRole } from '@shared/context/AssetContext';

interface DecisionAnalysis {
  asset: Asset;
  valorActual: number;
  porcentajeDepreciado: number;
  costoReparacionPendiente: number;
  falla: FallaCorrectiva | null;
  decision: 'reparar' | 'evaluar' | 'reemplazar';
  razon: string;
}

export function RepairVsReplace() {
  const assets = useAssets();
  const role = useRole();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Build analysis for each asset that has a pending/repair falla
  const analyses: DecisionAnalysis[] = assets.map((asset) => {
    const dep = calcDepreciation(asset.valor, asset.fechaCompra, asset.vidaUtil);
    const valorActual = dep.currentValue;
    const porcentaje = dep.porcentajeDepreciado;
    const falla = mockFallasCorrectivas.find(
      (f) => f.assetId === asset.id && f.estado !== 'Resuelto'
    ) ?? null;
    const costoRep = falla ? falla.costoReparacion : 0;

    let decision: DecisionAnalysis['decision'] = 'reparar';
    let razon = 'Costo de reparación inferior al 30% del valor actual.';

    if (valorActual === 0) {
      decision = 'reemplazar';
      razon = 'El activo está completamente depreciado (valor contable $0). Evalúa reemplazo.';
    } else if (costoRep > 0 && costoRep >= valorActual * 0.9) {
      decision = 'reemplazar';
      razon = `Costo de reparación ($${costoRep.toLocaleString('es-EC')}) supera el 90% del valor actual depreciado ($${valorActual.toLocaleString('es-EC', { minimumFractionDigits: 2 })}). Se recomienda evaluar reemplazo.`;
    } else if (costoRep > 0 && costoRep >= valorActual * 0.5) {
      decision = 'evaluar';
      razon = `Costo de reparación ($${costoRep.toLocaleString('es-EC')}) representa el ${Math.round((costoRep / valorActual) * 100)}% del valor actual. Evaluar costo-beneficio antes de autorizar.`;
    } else if (costoRep > 0) {
      razon = `Costo de reparación ($${costoRep.toLocaleString('es-EC')}) es razonable vs valor actual ($${valorActual.toLocaleString('es-EC', { minimumFractionDigits: 2 })}).`;
    } else if (porcentaje >= 80) {
      decision = 'evaluar';
      razon = `Activo con ${porcentaje}% depreciado. En próxima falla, considerar reemplazo.`;
    }

    return { asset, valorActual, porcentajeDepreciado: porcentaje, costoReparacionPendiente: costoRep, falla, decision, razon };
  });

  const reemplazarCount = analyses.filter((a) => a.decision === 'reemplazar').length;
  const evaluarCount = analyses.filter((a) => a.decision === 'evaluar').length;
  const repararCount = analyses.filter((a) => a.decision === 'reparar').length;

  const decisionConfig = {
    reemplazar: { label: 'Reemplazar', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: RefreshCw, dot: 'bg-rose-500' },
    evaluar: { label: 'Evaluar', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle, dot: 'bg-amber-500' },
    reparar: { label: 'Reparar', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Hammer, dot: 'bg-emerald-500' },
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reparar vs. Reemplazar</h1>
        <p className="text-slate-500 mt-1">
          Análisis de costo-beneficio para cada activo — alerta cuando reparar cuesta más que reemplazar (F7.1)
        </p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {(['reemplazar', 'evaluar', 'reparar'] as const).map((d) => {
          const cfg = decisionConfig[d];
          const count = d === 'reemplazar' ? reemplazarCount : d === 'evaluar' ? evaluarCount : repararCount;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={d}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${cfg.bg} border ${cfg.border} rounded-xl p-5`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={18} className={cfg.text} />
                <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</p>
              </div>
              <p className={`text-3xl font-bold ${cfg.text}`}>{count}</p>
              <p className={`text-xs mt-1 ${cfg.text} opacity-70`}>activos</p>
            </motion.div>
          );
        })}
      </div>

      {/* Info banner para Jefe */}
      {role === 'jefe' && (reemplazarCount > 0 || evaluarCount > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6"
        >
          <ShieldAlert size={20} className="text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-700 text-sm">
              {reemplazarCount} activo{reemplazarCount !== 1 ? 's' : ''} requiere{reemplazarCount === 1 ? '' : 'n'} evaluación de reemplazo
            </p>
            <p className="text-xs text-rose-500 mt-0.5">
              El costo estimado de reparación supera el valor actual depreciado. Se recomienda análisis de compra de reemplazo.
            </p>
          </div>
        </motion.div>
      )}

      {/* Asset cards */}
      <div className="space-y-4">
        {[...analyses]
          .sort((a, b) => {
            const order = { reemplazar: 0, evaluar: 1, reparar: 2 };
            return order[a.decision] - order[b.decision];
          })
          .map(({ asset, valorActual, porcentajeDepreciado, costoReparacionPendiente, falla, decision, razon }) => {
            const cfg = decisionConfig[decision];
            const Icon = cfg.icon;
            const isExp = expanded === asset.id;
            const ratio = costoReparacionPendiente > 0 ? Math.round((costoReparacionPendiente / Math.max(valorActual, 1)) * 100) : null;

            return (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${decision === 'reemplazar' ? 'border-rose-300 ring-1 ring-rose-200' : decision === 'evaluar' ? 'border-amber-200' : 'border-slate-200'}`}
              >
                {/* Card header */}
                <div
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(isExp ? null : asset.id)}
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900">{asset.descripcion}</h3>
                      <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                        <Icon size={12} />
                        {cfg.label}
                      </span>
                      {falla && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                          Falla activa
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">{razon}</p>
                  </div>

                  {/* Mini métricas */}
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Valor Actual</p>
                      <p className={`font-bold text-sm ${valorActual === 0 ? 'text-slate-400' : 'text-emerald-600'}`}>
                        ${valorActual.toLocaleString('es-EC', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    {costoReparacionPendiente > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Costo Rep.</p>
                        <p className={`font-bold text-sm ${decision === 'reemplazar' ? 'text-rose-600' : decision === 'evaluar' ? 'text-amber-600' : 'text-slate-700'}`}>
                          ${costoReparacionPendiente.toLocaleString('es-EC')}
                        </p>
                      </div>
                    )}
                    {ratio !== null && (
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Ratio</p>
                        <p className={`font-bold text-sm ${ratio >= 90 ? 'text-rose-600' : ratio >= 50 ? 'text-amber-600' : 'text-slate-700'}`}>
                          {ratio}%
                        </p>
                      </div>
                    )}
                    <div className="p-1.5 text-slate-400 bg-slate-100 rounded-full">
                      {isExp ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Detalle expandido */}
                <AnimatePresence>
                  {isExp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 bg-slate-50/50"
                    >
                      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Datos del activo */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Datos del Activo</p>
                          <div className="space-y-2">
                            {[
                              { label: 'Código', value: asset.codigo },
                              { label: 'Tipo', value: asset.tipo },
                              { label: 'Marca / Modelo', value: `${asset.marca} ${asset.modelo}` },
                              { label: 'Fecha Compra', value: asset.fechaCompra },
                              { label: 'Valor Original', value: `$${asset.valor.toLocaleString('es-EC', { minimumFractionDigits: 2 })}` },
                              { label: 'Vida Útil', value: `${asset.vidaUtil} años` },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex justify-between text-sm bg-white p-2 rounded border border-slate-200">
                                <span className="text-slate-500">{label}</span>
                                <span className="font-medium text-slate-900">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Análisis de depreciación */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Análisis de Valor</p>
                          <div className="space-y-3">
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500">Depreciado</span>
                                <span className={`font-bold ${porcentajeDepreciado >= 80 ? 'text-rose-600' : 'text-slate-700'}`}>
                                  {porcentajeDepreciado}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2.5">
                                <div
                                  className={`h-2.5 rounded-full ${porcentajeDepreciado >= 80 ? 'bg-rose-500' : porcentajeDepreciado >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${porcentajeDepreciado}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex justify-between text-sm bg-white p-2 rounded border border-slate-200">
                              <span className="text-slate-500">Valor actual</span>
                              <span className={`font-bold ${valorActual === 0 ? 'text-slate-400' : 'text-emerald-600'}`}>
                                ${valorActual.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {costoReparacionPendiente > 0 && (
                              <>
                                <div className={`flex justify-between text-sm p-2 rounded border ${decision === 'reemplazar' ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                                  <span className={decision === 'reemplazar' ? 'text-rose-600 font-medium' : 'text-slate-500'}>
                                    Costo reparación
                                  </span>
                                  <span className={`font-bold ${decision === 'reemplazar' ? 'text-rose-700' : 'text-slate-900'}`}>
                                    ${costoReparacionPendiente.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                {ratio !== null && ratio >= 50 && (
                                  <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${decision === 'reemplazar' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                    <TrendingDown size={14} className="flex-shrink-0 mt-0.5" />
                                    <span>
                                      La reparación representa el <strong>{ratio}%</strong> del valor actual del activo.
                                      {ratio >= 90 ? ' Reparar equivale a comprar un activo nuevo.' : ' Considera el historial de fallas antes de aprobar.'}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Falla activa y recomendación */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recomendación</p>
                          <div className={`p-4 rounded-xl border ${cfg.bg} ${cfg.border} mb-4`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Icon size={18} className={cfg.text} />
                              <span className={`font-bold text-sm ${cfg.text}`}>{cfg.label}</span>
                            </div>
                            <p className={`text-xs leading-relaxed ${cfg.text}`}>{razon}</p>
                          </div>
                          {falla && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Falla Activa</p>
                              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                                <p className="text-xs font-medium text-slate-900">{falla.descripcionFalla.slice(0, 80)}...</p>
                                <p className="text-[10px] text-slate-400">Estado: {falla.estado}</p>
                                <p className="text-[10px] text-slate-400">Técnico: {falla.tecnico}</p>
                              </div>
                            </div>
                          )}
                          {!falla && (
                            <div className="flex items-center gap-2 text-xs text-slate-400 bg-white p-3 rounded-lg border border-slate-100">
                              <Info size={14} />
                              Sin fallas correctivas activas. Análisis basado en depreciación.
                            </div>
                          )}
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
  );
}
