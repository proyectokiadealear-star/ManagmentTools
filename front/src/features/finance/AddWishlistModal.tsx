import { X, Save } from 'lucide-react';
import { WishlistItem } from '../../data/mockData';
import { ModalShell, Button } from '@shared/components';

interface AddWishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  newWishlist: Partial<WishlistItem>;
  setNewWishlist: (value: Partial<WishlistItem>) => void;
  handleSaveWishlist: (e: React.FormEvent) => void;
}

export function AddWishlistModal({
  isOpen,
  onClose,
  newWishlist,
  setNewWishlist,
  handleSaveWishlist,
}: AddWishlistModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      maxHeight="max-h-[90vh]"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xl font-bold text-slate-900">
          Nuevo Item de Wishlist
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
              <form
                id="wishlist-form"
                onSubmit={handleSaveWishlist}
                className="space-y-4">

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Descripción *
                  </label>
                  <input
                    required
                    type="text"
                    value={newWishlist.descripcion || ''}
                    onChange={(e) => setNewWishlist({ ...newWishlist, descripcion: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tipo
                    </label>
                    <select
                      value={newWishlist.tipo}
                      onChange={(e) => setNewWishlist({ ...newWishlist, tipo: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500">
                      <option value="Equipo">Equipo</option>
                      <option value="Herramienta">Herramienta</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Conector">Conector</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Prioridad
                    </label>
                    <select
                      value={newWishlist.prioridad}
                      onChange={(e) => setNewWishlist({ ...newWishlist, prioridad: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500">
                      <option value="Alta">Alta</option>
                      <option value="Media">Media</option>
                      <option value="Baja">Baja</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={newWishlist.marca || ''}
                      onChange={(e) => setNewWishlist({ ...newWishlist, marca: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={newWishlist.modelo || ''}
                      onChange={(e) => setNewWishlist({ ...newWishlist, modelo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newWishlist.cantidad || 1}
                      onChange={(e) => setNewWishlist({ ...newWishlist, cantidad: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Solicitado Por
                    </label>
                    <input
                      type="text"
                      value={newWishlist.solicitadoPor || ''}
                      onChange={(e) => setNewWishlist({ ...newWishlist, solicitadoPor: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Justificación *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newWishlist.justificacion || ''}
                    onChange={(e) => setNewWishlist({ ...newWishlist, justificacion: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" form="wishlist-form" variant="primary" color="amber">
                <Save size={16} /> Guardar Item
              </Button>
            </div>
    </ModalShell>
  );
}
