import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  FileText,
  Upload,
  Plus,
  Trash2,
  Star,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Save,
  Award,
  DollarSign,
  Clock,
  Shield,
  Phone,
  Mail,
  Building2,
} from 'lucide-react';
import {
  Asset,
  ProformaServicio,
  CotizacionRegistro,
  TipoCotizacion,
} from '../../data/mockData';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface QuotationModalProps {
  /** Si viene con una cotización existente, se abre en modo "ver/editar/seleccionar" */
  cotizacion?: CotizacionRegistro;
  /** Lista de activos disponibles para elegir */
  assets: Asset[];
  onClose: () => void;
  /** Se llama al guardar una nueva cotización (con sus proformas) */
  onSave: (cotizacion: CotizacionRegistro) => void;
  /** Se llama al marcar una proforma como ganadora */
  onSelectGanadora: (cotizacionId: string, proformaId: string) => void;
}

const TIPOS_COTIZACION: TipoCotizacion[] = ['Correctivo', 'Preventivo', 'Correctivo y Preventivo'];

const emptyProforma = (): Omit<ProformaServicio, 'id' | 'seleccionada'> => ({
  proveedor: '',
  contacto: '',
  telefono: '',
  correo: '',
  descripcionServicio: '',
  valorManoObra: 0,
  valorRepuestos: 0,
  valorTotal: 0,
  tiempoEstimadoDias: 1,
  garantiaDias: 90,
  fechaCotizacion: new Date().toISOString().split('T')[0],
  validezDias: 30,
  condiciones: '',
  documentoUrl: '',
});

// ─── Componente principal ─────────────────────────────────────────────────────

export function QuotationModal({
  cotizacion,
  assets,
  onClose,
  onSave,
  onSelectGanadora,
}: QuotationModalProps) {
  const isEditing = !cotizacion; // true = nueva cotización, false = ver/seleccionar

  // ── Estado modo NUEVA cotización ──
  const [step, setStep] = useState<'datos' | 'proformas' | 'guardado'>(isEditing ? 'datos' : 'guardado');
  const [assetId, setAssetId] = useState('');
  const [tipo, setTipo] = useState<TipoCotizacion>('Correctivo');
  const [descripcion, setDescripcion] = useState('');

  // Cada proforma en el formulario
  const [proformaForms, setProformaForms] = useState<Array<Omit<ProformaServicio, 'id' | 'seleccionada'> & { archivoNombre?: string }>>([
    { ...emptyProforma() },
    { ...emptyProforma() },
    { ...emptyProforma() },
  ]);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Estado modo VER / seleccionar ganadora ──
  const [selectedId, setSelectedId] = useState<string | null>(
    cotizacion?.proformas.find((p) => p.seleccionada)?.id ?? null
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const selectedAsset = assets.find((a) => a.id === assetId);

  const updateProforma = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setProformaForms((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // Auto-calcular total
      if (field === 'valorManoObra' || field === 'valorRepuestos') {
        const mo = field === 'valorManoObra' ? Number(value) : next[index].valorManoObra;
        const rp = field === 'valorRepuestos' ? Number(value) : next[index].valorRepuestos;
        next[index].valorTotal = mo + rp;
      }
      return next;
    });
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProformaForms((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], archivoNombre: file.name, documentoUrl: file.name };
      return next;
    });
  };

  const addProforma = () => {
    setProformaForms((prev) => [...prev, { ...emptyProforma() }]);
  };

  const removeProforma = (index: number) => {
    if (proformaForms.length <= 3) return; // mínimo 3
    setProformaForms((prev) => prev.filter((_, i) => i !== index));
  };

  const canContinue = assetId !== '' && descripcion.trim() !== '';

  const canSave = proformaForms.every(
    (p) => p.proveedor.trim() !== '' && p.valorTotal > 0
  );

  const handleSave = () => {
    const nuevaCotizacion: CotizacionRegistro = {
      id: `COT-${Date.now()}`,
      assetId,
      assetDescripcion: selectedAsset?.descripcion ?? assetId,
      tipo,
      descripcionTrabajo: descripcion,
      fechaRegistro: new Date().toISOString().split('T')[0],
      creadoPor: 'Jefe de Taller',
      proformas: proformaForms.map((p, i) => ({
        id: `PS-${Date.now()}-${i}`,
        seleccionada: false,
        proveedor: p.proveedor,
        contacto: p.contacto,
        telefono: p.telefono,
        correo: p.correo,
        descripcionServicio: p.descripcionServicio,
        valorManoObra: p.valorManoObra,
        valorRepuestos: p.valorRepuestos,
        valorTotal: p.valorTotal,
        tiempoEstimadoDias: p.tiempoEstimadoDias,
        garantiaDias: p.garantiaDias,
        fechaCotizacion: p.fechaCotizacion,
        validezDias: p.validezDias,
        condiciones: p.condiciones,
        documentoUrl: p.documentoUrl,
      })),
      estado: 'Completa',
    };
    onSave(nuevaCotizacion);
    setStep('guardado');
  };

  const handleConfirmGanadora = () => {
    if (!selectedId || !cotizacion) return;
    setConfirming(true);
    setTimeout(() => {
      onSelectGanadora(cotizacion.id, selectedId);
    }, 1400);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative z-10 w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {cotizacion ? `Cotización ${cotizacion.id}` : 'Nueva Cotización'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {cotizacion
                ? `${cotizacion.assetDescripcion} · ${cotizacion.tipo}`
                : 'Registra las proformas del servicio a contratar'}
            </p>

            {/* Step pills — solo en modo nueva */}
            {isEditing && step !== 'guardado' && (
              <div className="flex items-center gap-2 mt-3">
                {(['datos', 'proformas'] as const).map((s, i) => (
                  <React.Fragment key={s}>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                      step === s ? 'bg-blue-600 text-white' :
                      (step === 'proformas' && i === 0) ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {i + 1}. {s === 'datos' ? 'Datos del servicio' : 'Proformas'}
                    </span>
                    {i < 1 && <span className="w-5 h-px bg-slate-300" />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full ml-4 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ════════ STEP 1: Datos del servicio ════════ */}
            {step === 'datos' && (
              <motion.div key="datos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-5">

                {/* Activo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Activo / Equipo *
                  </label>
                  <select
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">— Selecciona un activo —</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.descripcion} ({a.codigo})
                      </option>
                    ))}
                  </select>
                  {selectedAsset && (
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedAsset.marca} {selectedAsset.modelo} · {selectedAsset.ubicacion}
                    </p>
                  )}
                </div>

                {/* Tipo de trabajo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Tipo de trabajo *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TIPOS_COTIZACION.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTipo(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                          tipo === t
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Descripción del trabajo a cotizar *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ej: Reparación de sensor de alineación delantero izquierdo y recalibración del sistema…"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  En el siguiente paso cargarás mínimo <strong>3 proformas</strong> de proveedores distintos para comparar.
                </div>
              </motion.div>
            )}

            {/* ════════ STEP 2: Proformas ════════ */}
            {step === 'proformas' && (
              <motion.div key="proformas" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-4">

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">
                      Proformas de proveedores <span className="text-slate-400 font-normal">({proformaForms.length} cargadas)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Completa los datos de cada proforma. Mínimo 3 proveedores distintos.
                    </p>
                  </div>
                  <button
                    onClick={addProforma}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Plus size={14} /> Agregar proforma
                  </button>
                </div>

                {proformaForms.map((p, index) => (
                  <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                    {/* Header de la proforma */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
                          {index + 1}
                        </span>
                        Proforma {index + 1}
                        {p.proveedor && <span className="font-normal text-slate-500">— {p.proveedor}</span>}
                      </span>
                      {proformaForms.length > 3 && (
                        <button onClick={() => removeProforma(index)} className="p-1 text-rose-400 hover:bg-rose-50 rounded transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Campos */}
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Proveedor *</label>
                        <input
                          type="text" placeholder="Nombre del proveedor"
                          value={p.proveedor}
                          onChange={(e) => updateProforma(index, 'proveedor', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Contacto</label>
                        <input
                          type="text" placeholder="Nombre del contacto"
                          value={p.contacto}
                          onChange={(e) => updateProforma(index, 'contacto', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Teléfono</label>
                        <input
                          type="text" placeholder="09XX-XXX-XXX"
                          value={p.telefono}
                          onChange={(e) => updateProforma(index, 'telefono', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Correo</label>
                        <input
                          type="email" placeholder="contacto@proveedor.com"
                          value={p.correo}
                          onChange={(e) => updateProforma(index, 'correo', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Descripción del servicio ofertado *</label>
                        <textarea
                          rows={2} placeholder="Detalla qué incluye el servicio…"
                          value={p.descripcionServicio}
                          onChange={(e) => updateProforma(index, 'descripcionServicio', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Mano de obra ($) *</label>
                        <input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          value={p.valorManoObra || ''}
                          onChange={(e) => updateProforma(index, 'valorManoObra', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Repuestos / materiales ($)</label>
                        <input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          value={p.valorRepuestos || ''}
                          onChange={(e) => updateProforma(index, 'valorRepuestos', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Total ($)</label>
                        <div className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800">
                          ${p.valorTotal.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Tiempo estimado (días)</label>
                        <input
                          type="number" min="1"
                          value={p.tiempoEstimadoDias}
                          onChange={(e) => updateProforma(index, 'tiempoEstimadoDias', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Garantía (días)</label>
                        <input
                          type="number" min="0"
                          value={p.garantiaDias}
                          onChange={(e) => updateProforma(index, 'garantiaDias', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Validez de la cotización (días)</label>
                        <input
                          type="number" min="1"
                          value={p.validezDias}
                          onChange={(e) => updateProforma(index, 'validezDias', parseInt(e.target.value) || 30)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Fecha de la cotización</label>
                        <input
                          type="date"
                          value={p.fechaCotizacion}
                          onChange={(e) => updateProforma(index, 'fechaCotizacion', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Condiciones / notas adicionales</label>
                        <input
                          type="text" placeholder="Ej: Incluye transporte, garantía extendida…"
                          value={p.condiciones}
                          onChange={(e) => updateProforma(index, 'condiciones', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                      </div>

                      {/* Upload del documento de la proforma */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Documento de la proforma (PDF / imagen)
                        </label>
                        {!p.archivoNombre ? (
                          <button
                            type="button"
                            onClick={() => fileRefs.current[index]?.click()}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 border border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all w-full justify-center"
                          >
                            <Upload size={14} /> Subir documento
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <FileText size={14} className="text-emerald-600 flex-shrink-0" />
                            <span className="text-xs text-emerald-700 font-medium flex-1 truncate">{p.archivoNombre}</span>
                            <button
                              onClick={() => {
                                setProformaForms((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], archivoNombre: undefined, documentoUrl: '' };
                                  return next;
                                });
                              }}
                              className="p-0.5 text-emerald-400 hover:text-rose-500 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        )}
                        <input
                          ref={(el) => { fileRefs.current[index] = el; }}
                          type="file" accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => handleFileChange(index, e)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {!canSave && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    Completa el <strong>proveedor</strong> y el <strong>valor total</strong> de cada proforma para guardar.
                  </div>
                )}
              </motion.div>
            )}

            {/* ════════ STEP 3 / modo VER: Guardado + seleccionar ganadora ════════ */}
            {(step === 'guardado' || !isEditing) && (
              <motion.div key="guardado" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-4">

                {/* Si acaba de guardar (nueva) — confirmación */}
                {isEditing && step === 'guardado' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-2"
                  >
                    <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">¡Cotización guardada correctamente!</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Ahora puedes seleccionar la proforma ganadora.</p>
                    </div>
                  </motion.div>
                )}

                {/* Lista de proformas para comparar y elegir */}
                {(() => {
                  const proformas = cotizacion?.proformas ?? [];
                  const minValor = proformas.length > 0 ? Math.min(...proformas.map((p) => p.valorTotal)) : 0;

                  if (proformas.length === 0) {
                    return (
                      <div className="flex flex-col items-center py-10 text-slate-400 gap-2">
                        <FileText size={32} className="opacity-40" />
                        <p className="text-sm">No hay proformas registradas todavía.</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                          <Award size={15} className="text-blue-600" />
                          Selecciona la proforma ganadora ({proformas.length} recibidas)
                        </h3>
                        {cotizacion?.estado === 'Aprobada' && (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            ✓ Aprobada
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        {proformas.map((p) => {
                          const isSelected = selectedId === p.id;
                          const isMin = p.valorTotal === minValor;
                          const isExpanded = expandedId === p.id;
                          return (
                            <motion.div key={p.id} layout
                              className={`rounded-xl border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50/60 shadow-md shadow-blue-100'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              {/* Fila resumen */}
                              <div className="p-4 flex items-center gap-3" onClick={() => setSelectedId(p.id)}>
                                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                  isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                                }`}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                    <p className="font-semibold text-slate-900 text-sm">{p.proveedor}</p>
                                    {isMin && (
                                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                        <TrendingDown size={10} /> Menor costo
                                      </span>
                                    )}
                                    {p.seleccionada && (
                                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                        <Star size={10} /> Ganadora
                                      </span>
                                    )}
                                    {isSelected && !p.seleccionada && (
                                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                        Seleccionada
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 line-clamp-1">{p.descripcionServicio}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className={`text-xl font-bold ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                                    ${p.valorTotal.toLocaleString('es-EC')}
                                  </p>
                                  <p className="text-[10px] text-slate-400">{p.tiempoEstimadoDias}d · {p.garantiaDias}d garantía</p>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : p.id); }}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex-shrink-0"
                                >
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </div>

                              {/* Detalle expandido */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                          <DollarSign size={11} /> Desglose
                                        </p>
                                        <div className="space-y-1 text-sm">
                                          <div className="flex justify-between">
                                            <span className="text-slate-500">Mano de obra</span>
                                            <span className="font-medium">${p.valorManoObra.toLocaleString('es-EC')}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-500">Repuestos</span>
                                            <span className="font-medium">${p.valorRepuestos.toLocaleString('es-EC')}</span>
                                          </div>
                                          <div className="flex justify-between border-t border-slate-200 pt-1">
                                            <span className="font-semibold">Total</span>
                                            <span className="font-bold">${p.valorTotal.toLocaleString('es-EC')}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        {p.condiciones && (
                                          <div>
                                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                                              <Shield size={11} /> Condiciones
                                            </p>
                                            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">{p.condiciones}</p>
                                          </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-1 text-xs text-slate-500">
                                          {p.telefono && <span className="flex items-center gap-1 col-span-2"><Phone size={10} /> {p.telefono}</span>}
                                          {p.correo && <span className="flex items-center gap-1 col-span-2 truncate"><Mail size={10} /> {p.correo}</span>}
                                          {p.contacto && <span className="flex items-center gap-1 col-span-2"><Building2 size={10} /> {p.contacto}</span>}
                                          <span className="flex items-center gap-1"><Clock size={10} /> Validez: {p.validezDias}d</span>
                                          <span className="flex items-center gap-1">{p.fechaCotizacion}</span>
                                        </div>
                                        {p.documentoUrl && (
                                          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                            <FileText size={12} />
                                            <span className="truncate">{p.documentoUrl}</span>
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

                      {/* Confirmación animada al seleccionar */}
                      <AnimatePresence>
                        {confirming && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center py-8 gap-3"
                          >
                            <motion.div
                              initial={{ scale: 0 }} animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                              className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center"
                            >
                              <CheckCircle2 size={32} className="text-emerald-600" />
                            </motion.div>
                            <p className="text-sm font-bold text-slate-800">Proforma aprobada</p>
                            <p className="text-xs text-slate-500">
                              {proformas.find((p) => p.id === selectedId)?.proveedor} — ${proformas.find((p) => p.id === selectedId)?.valorTotal.toLocaleString('es-EC')}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  );
                })()}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 flex-shrink-0 rounded-b-2xl">
          <button
            onClick={step === 'proformas' ? () => setStep('datos') : onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            {step === 'proformas' ? '← Volver' : 'Cerrar'}
          </button>

          {step === 'datos' && (
            <button
              disabled={!canContinue}
              onClick={() => setStep('proformas')}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Continuar → Proformas
            </button>
          )}

          {step === 'proformas' && (
            <button
              disabled={!canSave}
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Save size={15} /> Guardar cotización
            </button>
          )}

          {(step === 'guardado' || !isEditing) && !confirming && cotizacion && (
            <button
              disabled={!selectedId || cotizacion?.estado === 'Aprobada'}
              onClick={handleConfirmGanadora}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Star size={15} />
              {cotizacion?.estado === 'Aprobada' ? 'Ya aprobada' : 'Aprobar proforma seleccionada'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
