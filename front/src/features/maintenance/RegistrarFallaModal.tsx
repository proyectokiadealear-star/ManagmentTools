import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, CircleAlert } from 'lucide-react';
import { FallaCorrectiva } from '../../data/mockData';

interface RegistrarFallaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  newFalla: Partial<FallaCorrectiva>;
  setNewFalla: React.Dispatch<React.SetStateAction<Partial<FallaCorrectiva>>>;
}

export function RegistrarFallaModal({
  isOpen,
  onClose,
  onSave,
  newFalla,
  setNewFalla,
}: RegistrarFallaModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Registrar Falla Correctiva (F6.1)</h2>
              <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form id="falla-form" onSubmit={onSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Activo afectado *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Alineadora 3D HawkEye"
                    value={newFalla.assetDescripcion || ''}
                    onChange={(e) => setNewFalla({ ...newFalla, assetDescripcion: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Descripción de la falla *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe detalladamente el problema observado..."
                    value={newFalla.descripcionFalla || ''}
                    onChange={(e) => setNewFalla({ ...newFalla, descripcionFalla: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de causa</label>
                    <select
                      value={newFalla.tipoCausa}
                      onChange={(e) => setNewFalla({ ...newFalla, tipoCausa: e.target.value as FallaCorrectiva['tipoCausa'] })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    >
                      <option value="Mecánica">Mecánica</option>
                      <option value="Eléctrica">Eléctrica</option>
                      <option value="Software">Software</option>
                      <option value="Desgaste">Desgaste</option>
                      <option value="Accidente">Accidente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tiempo de parada (horas)</label>
                    <input
                      type="number"
                      min="0"
                      value={newFalla.tiempoParada || ''}
                      onChange={(e) => setNewFalla({ ...newFalla, tiempoParada: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Técnico responsable</label>
                    <input
                      type="text"
                      value={newFalla.tecnico || ''}
                      onChange={(e) => setNewFalla({ ...newFalla, tecnico: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Proveedor propuesto</label>
                    <input
                      type="text"
                      value={newFalla.proveedor || ''}
                      onChange={(e) => setNewFalla({ ...newFalla, proveedor: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Costo estimado ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newFalla.costoReparacion || ''}
                      onChange={(e) => setNewFalla({ ...newFalla, costoReparacion: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  <CircleAlert size={14} className="flex-shrink-0" />
                  Esta falla quedará en estado <strong>"Pendiente Autorización"</strong> hasta que el Jefe de Taller la apruebe.
                </div>
              </form>
            </div>
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
                form="falla-form"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700"
              >
                <Save size={16} /> Registrar Falla
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
