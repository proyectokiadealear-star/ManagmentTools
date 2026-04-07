import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MapPin,
  User,
  Tag,
  AlertCircle,
  FileText,
  FileDown,
  Wrench,
  Send,
  History,
  AlertOctagon,
  CalendarClock,
} from 'lucide-react';
import { Asset } from '../../data/mockData';
import { calcDepreciation } from '@shared/utils/depreciation';
import { ConfirmModal } from '@shared/components';
import { FichaTecnicaPreviewModal } from './FichaTecnicaPreviewModal';
import { getAreas, AreaAPI } from '../../services/assetService';

interface AssetDetailModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (asset: Asset) => void;
  onDelete?: (assetId: string) => void;
  onSolicitarPrestamo?: () => void;
}

export function AssetDetailModal({
  asset,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onSolicitarPrestamo,
}: AssetDetailModalProps) {
  // Hooks must be called unconditionally — guard is done inside JSX below
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [areas, setAreas] = useState<AreaAPI[]>([]);

  useEffect(() => {
    getAreas().then(setAreas).catch(() => {});
  }, []);

  const getAreaNombre = (areaId: string | undefined) => {
    if (!areaId) return 'No definida';
    const found = areas.find(a => a.id === areaId);
    return found ? found.nombre : areaId;
  };

  // Calcular próximo mantenimiento a partir del último + periodicidad
  const calcProximoMantenimiento = () => {
    if (!asset?.fechaUltimoMantenimiento || !asset?.periodicidad) return null;
    const periodicidadMap: Record<string, number> = {
      mensual: 30, trimestral: 90, semestral: 180, anual: 365,
    };
    const dias = periodicidadMap[asset.periodicidad.toLowerCase()] ?? 365;
    const ultimo = new Date(asset.fechaUltimoMantenimiento);
    const proximo = new Date(ultimo);
    proximo.setDate(proximo.getDate() + dias);
    const diasRestantes = Math.ceil((proximo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    let semaforo: 'verde' | 'amarillo' | 'rojo' = 'verde';
    if (diasRestantes <= 0) semaforo = 'rojo';
    else if (diasRestantes <= 30) semaforo = 'amarillo';
    return {
      proximo: proximo.toISOString().split('T')[0],
      diasRestantes,
      semaforo,
    };
  };
  const mant = asset ? calcProximoMantenimiento() : null;

  const handleOpenPdfPreview = () => setShowPdfPreview(true);

  // Compute depreciation only when we have a valid asset
  const dep = asset
    ? calcDepreciation(asset.valor ?? 0, asset.fechaCompra ?? '', asset.vidaUtil ?? 5)
    : null;

  return (
    <>
      <AnimatePresence>
        {isOpen && asset && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900">{asset.descripcion}</h2>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          asset.estado === 'Activo'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : asset.estado === 'En Reparación'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {asset.estado}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 font-mono">{asset.codigo}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(asset)}
                        className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
                      >
                        Editar
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => setShowConfirmDelete(true)}
                        className="px-3 py-1.5 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 transition-colors"
                      >
                        Eliminar
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors ml-2"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Visual Ficha (F1.2) */}
                    <div className="md:col-span-1 space-y-4">
                      <div className="aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative group">
                        {asset.imagenUrl ? (
                          <img
                            src={asset.imagenUrl}
                            alt={asset.descripcion}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <Wrench size={48} strokeWidth={1} className="mb-2 opacity-50" />
                            <span className="text-xs font-medium">Sin imagen</span>
                          </div>
                        )}
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm border border-slate-200 text-xs font-mono font-bold text-slate-700">
                          PLACA: {asset.placa}
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                          Identificación
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-slate-500">Marca / Modelo</p>
                            <p className="text-sm font-medium text-slate-900">
                              {asset.marca} {asset.modelo}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Número de Serie</p>
                            <p className="text-sm font-mono text-slate-700">{asset.serial}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Tipo de Activo</p>
                            <p className="text-sm font-medium text-slate-900">{asset.tipo}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="md:col-span-2 space-y-6">

                      {/* Ubicación Jerárquica (F1.1) */}
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
                          <MapPin size={16} className="text-blue-500" />
                          Ubicación Física
                        </h4>
                        <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Área</p>
                            <p className="text-sm font-medium text-slate-900">
                              {getAreaNombre(asset.area)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Bahía</p>
                            <p className="text-sm font-medium text-slate-900">
                              {asset.bahia || 'No definida'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Rack / Estante</p>
                            <p className="text-sm font-medium text-slate-900">
                              {asset.rack || 'No definido'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Caja / Posición</p>
                            <p className="text-sm font-medium text-slate-900">
                              {asset.caja || 'No definida'}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                          <AlertCircle size={12} />
                          Dato original (texto libre): "{asset.ubicacion}"
                        </p>
                      </div>

                      {/* Custodia (F2.1) */}
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
                          <User size={16} className="text-amber-500" />
                          Asignación y Custodia
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">Rol Responsable</p>
                            <p className="text-sm font-medium text-slate-900">{asset.responsable}</p>
                          </div>
                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                            <p className="text-xs text-amber-700 mb-1">Persona Custodio (Físico)</p>
                            <p className="text-sm font-medium text-amber-900">{asset.custodio}</p>
                          </div>
                        </div>
                      </div>

                      {/* Adquisición (F3.2) */}
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
                          <Tag size={16} className="text-emerald-500" />
                          Datos de Adquisición
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Proveedor</p>
                            <p className="text-sm font-medium text-slate-900 truncate" title={asset.proveedor}>
                              {asset.proveedor || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Factura</p>
                            <p className="text-sm font-mono text-slate-700">{asset.factura || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Fecha Compra</p>
                            <p className="text-sm font-medium text-slate-900">{asset.fechaCompra || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Valor Original</p>
                            <p className="text-sm font-bold text-slate-900">
                              ${(asset.valor ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Comparativa financiera (F3.2) */}
                      {dep && (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                            <p className="text-xs text-slate-500 mb-1">Costo Inicial</p>
                            <p className="text-lg font-bold text-slate-900">
                              ${(asset.valor ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div
                            className={`p-3 rounded-lg border text-center ${
                              dep.isFullyDepreciated
                                ? 'bg-rose-50 border-rose-200'
                                : 'bg-emerald-50 border-emerald-200'
                            }`}
                          >
                            <p
                              className={`text-xs mb-1 ${
                                dep.isFullyDepreciated ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                            >
                              Valor Actual
                            </p>
                            <p
                              className={`text-lg font-bold ${
                                dep.isFullyDepreciated ? 'text-rose-700' : 'text-emerald-700'
                              }`}
                            >
                              ${dep.currentValue.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                            </p>
                            {dep.isFullyDepreciated && (
                              <p className="text-[10px] text-rose-500 mt-0.5">Totalmente depreciado</p>
                            )}
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
                            <p className="text-xs text-blue-600 mb-1">Años de Uso</p>
                            <p className="text-lg font-bold text-blue-700">{dep.yearsUsed}</p>
                            <p className="text-[10px] text-blue-500 mt-0.5">
                              de {asset.vidaUtil} años útiles
                            </p>
                            <div className="mt-2 w-full bg-blue-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${dep.isFullyDepreciated ? 'bg-rose-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(100, dep.porcentajeDepreciado)}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-blue-400 mt-1">{dep.porcentajeDepreciado}% depreciado</p>
                          </div>
                        </div>
                      )}

                      {/* Planificación de Mantenimiento */}
                      {(asset.fechaUltimoMantenimiento || asset.periodicidad) && (
                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
                            <CalendarClock size={16} className="text-violet-500" />
                            Planificación de Mantenimiento
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                              <p className="text-xs text-slate-500 mb-1">Último Mantenimiento</p>
                              <p className="text-sm font-medium text-slate-900">
                                {asset.fechaUltimoMantenimiento || '—'}
                              </p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                              <p className="text-xs text-slate-500 mb-1">Periodicidad</p>
                              <p className="text-sm font-medium text-slate-900">
                                {asset.periodicidad || '—'}
                              </p>
                            </div>
                            {mant ? (
                              <div className={`p-3 rounded-lg border text-center ${
                                mant.semaforo === 'rojo' ? 'bg-rose-50 border-rose-200' :
                                mant.semaforo === 'amarillo' ? 'bg-amber-50 border-amber-200' :
                                'bg-emerald-50 border-emerald-200'
                              }`}>
                                <p className={`text-xs mb-1 font-semibold ${
                                  mant.semaforo === 'rojo' ? 'text-rose-600' :
                                  mant.semaforo === 'amarillo' ? 'text-amber-600' :
                                  'text-emerald-600'
                                }`}>Próximo Mantenimiento</p>
                                <p className={`text-sm font-bold ${
                                  mant.semaforo === 'rojo' ? 'text-rose-700' :
                                  mant.semaforo === 'amarillo' ? 'text-amber-700' :
                                  'text-emerald-700'
                                }`}>{mant.proximo}</p>
                                <p className={`text-[10px] mt-0.5 ${
                                  mant.semaforo === 'rojo' ? 'text-rose-500' :
                                  mant.semaforo === 'amarillo' ? 'text-amber-500' :
                                  'text-emerald-500'
                                }`}>
                                  {mant.diasRestantes < 0
                                    ? `${Math.abs(mant.diasRestantes)}d atrasado`
                                    : `+${mant.diasRestantes}d restantes`}
                                </p>
                              </div>
                            ) : asset.periodicidad && !asset.fechaUltimoMantenimiento ? (
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                                <p className="text-xs text-slate-400">Sin fecha de último mantenimiento</p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {/* Especificaciones y Notas */}
                      {(asset.capacidadEspecificacion || asset.observacion || asset.comentario) && (
                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
                            <FileText size={16} className="text-slate-400" />
                            Especificaciones y Notas
                          </h4>
                          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            {asset.capacidadEspecificacion && (
                              <div>
                                <span className="text-xs font-semibold text-slate-500 mr-2">
                                  Especificación:
                                </span>
                                <span className="text-sm text-slate-700">
                                  {asset.capacidadEspecificacion}
                                </span>
                              </div>
                            )}
                            {asset.observacion && (
                              <div>
                                <span className="text-xs font-semibold text-slate-500 mr-2">
                                  Observación:
                                </span>
                                <span className="text-sm text-slate-700">{asset.observacion}</span>
                              </div>
                            )}
                            {asset.comentario && (
                              <div>
                                <span className="text-xs font-semibold text-slate-500 mr-2">
                                  Comentario:
                                </span>
                                <span className="text-sm text-slate-700">{asset.comentario}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-wrap">
                  {onSolicitarPrestamo && (
                    <button
                      onClick={() => { onClose(); onSolicitarPrestamo(); }}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                      <Send size={14} />
                      Solicitar Préstamo
                    </button>
                  )}
                  <button
                    onClick={handleOpenPdfPreview}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <FileDown size={14} />
                    Ficha Técnica PDF
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    onClick={() => alert('Historial de movimientos — próximamente')}
                  >
                    <History size={14} />
                    Ver Historial
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                    onClick={() => alert('Reportar falla — próximamente')}
                  >
                    <AlertOctagon size={14} />
                    Reportar Falla
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* PDF Preview Modal */}
      <FichaTecnicaPreviewModal
        asset={asset}
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
      />

      {/* Confirm delete — rendered outside AnimatePresence so it stacks above the modal */}
      {asset && (
        <ConfirmModal
          isOpen={showConfirmDelete}
          onClose={() => setShowConfirmDelete(false)}
          onConfirm={() => {
            onDelete?.(asset.id);
            onClose();
          }}
          title="Eliminar activo"
          message={`¿Está seguro de que desea eliminar "${asset.descripcion}"? Esta acción no se puede deshacer.`}
          confirmLabel="Sí, eliminar"
          cancelLabel="Cancelar"
          variant="danger"
        />
      )}
    </>
  );
}
