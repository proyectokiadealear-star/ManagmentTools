/**
 * CorrectiveFailureModal.tsx
 * 
 * Modal completo para registrar fallas correctivas con:
 * - Evidencia fotográfica (múltiples fotos)
 * - Descripción detallada del problema
 * - Nivel de urgencia
 * - Impacto operativo
 * - Detección automática de tiempos
 * 
 * Este modal se usa desde:
 * - Vista de taller al hacer click en "Reportar Falla"
 * - Catálogo de activos
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, AlertTriangle, CheckCircle2, Upload, 
  Clock, DollarSign, Wrench, Camera, Trash2, 
  AlertCircle, FileWarning
} from 'lucide-react';
import { Asset } from '../../data/mockData';
import { httpClient } from '../../services/httpClient';
import { useAuth } from '@shared/context/AuthContext';

interface CorrectiveFailureModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (fallaId: string, codigoFalla: string) => void;
}

const emptyForm = {
  descripcionSintomas: '',
  impactoOperativo: '',
  urgencia: 'media' as const,
  tipoFalla: '' as const,
  fechaDeteccion: new Date().toISOString().split('T')[0],
  horaDeteccion: new Date().toTimeString().slice(0, 5),
};

export function CorrectiveFailureModal({ asset, isOpen, onClose, onSuccess }: CorrectiveFailureModalProps) {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [fotos, setFotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigoGenerado, setCodigoGenerado] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    setForm(emptyForm);
    setFotos([]);
    setPreviewUrls([]);
    setSaved(false);
    setError(null);
    setCodigoGenerado('');
    onClose();
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Limitar a 5 fotos máximo
    if (fotos.length + files.length > 5) {
      setError('Máximo 5 fotografías permitidas');
      return;
    }

    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setFotos(prev => [...prev, ...files]);
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    setError(null);
  }

  function eliminarFoto(index: number) {
    setFotos(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!asset) return;
    
    setSaving(true);
    setError(null);

    try {
      // 1. Subir fotos si hay alguna
      const fotosUrls: string[] = [];
      for (const foto of fotos) {
        try {
          const formData = new FormData();
          formData.append('file', foto);
          
          const user = await import('../../config/firebase').then(m => m.auth.currentUser);
          const token = await user?.getIdToken();
          
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });
          
          if (response.ok) {
            const data = await response.json();
            fotosUrls.push(data.url || data.imagenUrl);
          }
        } catch {
          // Si falla la subida, continuar sin la foto
          console.warn('Error subiendo foto, se guardará sin ella');
        }
      }

      // 2. Crear la falla
      const response = await httpClient.post<{ id: string; codigoFalla: string }>('/api/fallas', {
        activoId: asset.id,
        activoNombre: asset.descripcion,
        activoCodigo: asset.codigo,
        activoPlaca: asset.placa,
        descripcionSintomas: form.descripcionSintomas.trim(),
        fotografiaUrls: fotosUrls,
        impactoOperativo: form.impactoOperativo.trim(),
        urgencia: form.urgencia,
        tipoFalla: form.tipoFalla || undefined,
        reportadoPor: user?.uid || 'demo-user',
        reportadoPorNombre: user?.displayName || user?.email || 'Usuario Demo',
        fechaDeteccion: form.fechaDeteccion,
        horaDeteccion: form.horaDeteccion,
      });

      setSaved(true);
      setCodigoGenerado(response.codigoFalla);
      form.reset();
      
      if (onSuccess) {
        onSuccess(response.id, response.codigoFalla);
      }
    } catch (err) {
      console.error('Error creando falla:', err);
      setError('No se pudo registrar la falla. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  const urgenciaColores = {
    critica: { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-700', label: 'Crítica' },
    alta: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700', label: 'Alta' },
    media: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', label: 'Media' },
    baja: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', label: 'Baja' },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <FileWarning className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Reportar Falla Correctiva</h2>
                  <p className="text-xs text-slate-500">Registro de emergencia técnica</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {saved ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 py-10 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-emerald-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-800">Falla Registrada</p>
                    <p className="text-slate-500 mt-1">
                      Código asignado: <span className="font-mono font-semibold text-indigo-600">{codigoGenerado}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
                    <Clock size={16} />
                    <span>Iniciando cronómetro de tiempo de respuesta de gerencia</span>
                  </div>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Cerrar
                  </button>
                </motion.div>
              ) : (
                <form id="falla-form" onSubmit={handleSubmit} className="space-y-5">
                  {/* Activo info */}
                  {asset && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                        {asset.imagenUrl ? (
                          <img src={asset.imagenUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Wrench className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">Activo afectado</p>
                        <p className="text-sm font-semibold text-slate-800">{asset.descripcion}</p>
                        <p className="text-xs text-slate-400 font-mono">{asset.codigo} · {asset.placa}</p>
                      </div>
                    </div>
                  )}

                  {/* Fotografías */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Evidencia fotográfica <span className="text-slate-400 font-normal">(mínimo recomendado: 2 ángulos)</span>
                    </label>
                    <div className="flex flex-wrap gap-3 mb-2">
                      {previewUrls.map((url, i) => (
                        <div key={i} className="relative group">
                          <img 
                            src={url} 
                            alt={`Foto ${i + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => eliminarFoto(i)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {fotos.length < 5 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                        >
                          <Camera size={20} />
                          <span className="text-[10px] mt-1">Agregar</span>
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFotoChange}
                      className="hidden"
                    />
                    <p className="text-xs text-slate-400">{fotos.length}/5 fotos agregadas</p>
                  </div>

                  {/* Síntomas */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Descripción del síntoma/falla <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe detalladamente el problema observado, ruído, olor, comportamiento anormal..."
                      value={form.descripcionSintomas}
                      onChange={(e) => setForm({ ...form, descripcionSintomas: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-rose-500 focus:border-rose-500 resize-none"
                    />
                  </div>

                  {/* Impacto operativo */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Impacto operativo <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Ej: Taller parado - 3 elevadores dependen del compresor"
                      value={form.impactoOperativo}
                      onChange={(e) => setForm({ ...form, impactoOperativo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-rose-500 focus:border-rose-500 resize-none"
                    />
                  </div>

                  {/* Urgencia y Tipo */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nivel de urgencia <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={form.urgencia}
                        onChange={(e) => setForm({ ...form, urgencia: e.target.value as any })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-rose-500 focus:border-rose-500"
                      >
                        <option value="critica">Crítica - Parada total</option>
                        <option value="alta">Alta - Afecta operación</option>
                        <option value="media">Media - Puede esperar</option>
                        <option value="baja">Baja - Mantenimiento</option>
                      </select>
                      {form.urgencia && (
                        <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-medium ${urgenciaColores[form.urgencia].bg} ${urgenciaColores[form.urgencia].text}`}>
                          {urgenciaColores[form.urgencia].label}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tipo de falla
                      </label>
                      <select
                        value={form.tipoFalla}
                        onChange={(e) => setForm({ ...form, tipoFalla: e.target.value as any })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-rose-500 focus:border-rose-500"
                      >
                        <option value="">Seleccionar tipo</option>
                        <option value="electrica">Eléctrica</option>
                        <option value="mecanica">Mecánica</option>
                        <option value="hidraulica">Hidráulica</option>
                        <option value="neumática">Neumática</option>
                        <option value="estructural">Estructural</option>
                        <option value="software">Software</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                  </div>

                  {/* Fecha y hora */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Fecha de detección <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="date"
                        value={form.fechaDeteccion}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setForm({ ...form, fechaDeteccion: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-rose-500 focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Hora de detección
                      </label>
                      <input
                        type="time"
                        value={form.horaDeteccion}
                        onChange={(e) => setForm({ ...form, horaDeteccion: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-rose-500 focus:border-rose-500"
                      />
                    </div>
                  </div>

                  {/* Alerta */}
                  <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-indigo-700">
                      <p className="font-semibold">El sistema generará automáticamente:</p>
                      <ul className="mt-1 text-xs space-y-1 opacity-80">
                        <li>• Código único de falla (FALLA-2024-XXX)</li>
                        <li>• Notificación inmediata al Jefe de Taller</li>
                        <li>• Inicio de cronómetro de tiempo de respuesta</li>
                        <li>• Bloqueo del equipo en el catálogo</li>
                      </ul>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-sm text-rose-700">
                      <AlertTriangle size={16} />
                      {error}
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Footer */}
            {!saved && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="text-xs text-slate-500">
                  <Clock size={14} className="inline mr-1" />
                  Se calculará tiempo de detección → reporte
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    form="falla-form"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-60 transition-colors"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Registrar Falla
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}