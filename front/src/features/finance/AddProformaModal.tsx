import { X, Save } from 'lucide-react';
import { Proforma } from '../../data/mockData';
import { ModalShell, Button } from '@shared/components';

interface AddProformaModalProps {
  isOpen: boolean;
  onClose: () => void;
  newProforma: Partial<Proforma>;
  setNewProforma: (value: Partial<Proforma>) => void;
  handleSaveProforma: (e: React.FormEvent) => void;
}

export function AddProformaModal({
  isOpen,
  onClose,
  newProforma,
  setNewProforma,
  handleSaveProforma,
}: AddProformaModalProps) {
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xl font-bold text-slate-900">
          Agregar Proforma
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
          <X size={20} />
        </button>
      </div>

            <div className="p-6">
              <form
                id="proforma-form"
                onSubmit={handleSaveProforma}
                className="space-y-4">

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Proveedor *
                  </label>
                  <input
                    required
                    type="text"
                    value={newProforma.proveedor || ''}
                    onChange={(e) => setNewProforma({ ...newProforma, proveedor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contacto
                  </label>
                  <input
                    type="text"
                    value={newProforma.contacto || ''}
                    onChange={(e) => setNewProforma({ ...newProforma, contacto: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Valor Total ($) *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProforma.valor || ''}
                      onChange={(e) => setNewProforma({ ...newProforma, valor: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Validez (Días)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newProforma.validezDias || 30}
                      onChange={(e) => setNewProforma({ ...newProforma, validezDias: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Condiciones
                  </label>
                  <input
                    type="text"
                    value={newProforma.condiciones || ''}
                    onChange={(e) => setNewProforma({ ...newProforma, condiciones: e.target.value })}
                    placeholder="Ej: Entrega inmediata, 50% anticipo"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" form="proforma-form" variant="primary" color="blue">
                <Save size={16} /> Guardar Proforma
              </Button>
            </div>
    </ModalShell>
  );
}
