import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HardHat, Plus, Pencil, X, Loader2, Package } from 'lucide-react';
import { useRole } from '@shared/context/AssetContext';
import { ModalShell, Pagination } from '@shared/components';
import { usePagination } from '@shared/hooks/usePagination';
import {
  getCatalogoEPP,
  addCatalogoEPP,
  updateCatalogoEPP,
} from '../../services/consumablesService';
import type { CatalogoEPP } from '../../services/consumablesService';

const TIPOS_EPP = [
  'guantes-nitrilo',
  'guantes-cuero',
  'mascarilla-n95',
  'mascarilla-quirurgica',
  'lentes-seguridad',
  'careta-facial',
  'calzado-punta-acero',
  'botas-goma',
  'overol',
  'chaleco-reflectante',
  'casco',
  'proteccion-auditiva',
  'arnes-seguridad',
  'otro',
];

const FRECUENCIAS = [
  { label: '30 días (mensual)', value: 30 },
  { label: '60 días (bimestral)', value: 60 },
  { label: '90 días (trimestral)', value: 90 },
  { label: '180 días (semestral)', value: 180 },
  { label: '365 días (anual)', value: 365 },
];

type FormData = {
  nombre: string;
  tipo: string;
  frecuenciaReposicionDias: string;
  costoUnitario: string;
  stockActual: string;
};

const emptyForm = (): FormData => ({
  nombre: '',
  tipo: '',
  frecuenciaReposicionDias: '',
  costoUnitario: '',
  stockActual: '',
});

export function EPPCatalog() {
  const role = useRole();
  const canEdit = role === 'tecnico' || role === 'jefe';

  const [catalogo, setCatalogo] = useState<CatalogoEPP[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<CatalogoEPP | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCatalogoEPP()
      .then(data => { if (!cancelled) { setCatalogo(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const {
    paginatedItems: pageItems,
    currentPage, pageSize,
    setCurrentPage, setPageSize,
    totalItems,
  } = usePagination(catalogo, 10);

  function openAdd() {
    setEditItem(null);
    setForm(emptyForm());
    setFormErrors({});
    setShowModal(true);
  }

  function openEdit(item: CatalogoEPP) {
    setEditItem(item);
    setForm({
      nombre: item.nombre,
      tipo: item.tipo,
      frecuenciaReposicionDias: String(item.frecuenciaReposicionDias),
      costoUnitario: String(item.costoUnitario),
      stockActual: item.stockActual !== undefined ? String(item.stockActual) : '',
    });
    setFormErrors({});
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditItem(null);
    setForm(emptyForm());
    setFormErrors({});
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!form.nombre.trim()) errors.nombre = 'Ingrese el nombre del EPP';
    if (!form.tipo) errors.tipo = 'Seleccione el tipo';
    if (!form.frecuenciaReposicionDias || Number(form.frecuenciaReposicionDias) <= 0)
      errors.frecuenciaReposicionDias = 'Seleccione la frecuencia de reposición';
    if (!form.costoUnitario || Number(form.costoUnitario) < 0)
      errors.costoUnitario = 'Ingrese un costo válido';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    const payload: Omit<CatalogoEPP, 'id'> = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      frecuenciaReposicionDias: Number(form.frecuenciaReposicionDias),
      costoUnitario: Number(form.costoUnitario),
      ...(form.stockActual !== '' && { stockActual: Number(form.stockActual) }),
    };
    try {
      if (editItem) {
        const updated = await updateCatalogoEPP(editItem.id, payload);
        setCatalogo(prev => prev.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await addCatalogoEPP(payload);
        setCatalogo(prev => [created, ...prev]);
      }
      closeModal();
    } catch (err) {
      console.error('[EPPCatalog] Error al guardar:', err);
    } finally {
      setSaving(false);
    }
  }

  function stockBadge(item: CatalogoEPP) {
    if (item.stockActual === undefined) return null;
    const isLow = item.stockActual <= 5;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isLow ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
        {isLow ? `Stock bajo: ${item.stockActual}` : item.stockActual}
      </span>
    );
  }

  function frecuenciaLabel(dias: number) {
    const found = FRECUENCIAS.find(f => f.value === dias);
    return found ? found.label : `${dias} días`;
  }

  return (
    <div className="p-6 space-y-6">
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          <p className="text-sm text-gray-500">Cargando catálogo de EPP...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* ── Header ── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <HardHat className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Catálogo de EPP</h1>
                <p className="text-sm text-gray-500">
                  Registra los equipos de protección personal disponibles antes de registrar entregas.
                </p>
              </div>
            </div>
            {canEdit && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-[transform,background-color] duration-150 ease-out active:scale-[0.97]"
              >
                <Plus className="h-4 w-4" />
                Agregar EPP
              </button>
            )}
          </div>

          {/* ── KPI summary ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
            >
              <div className="p-3 bg-amber-50 rounded-lg">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{catalogo.length}</p>
                <p className="text-sm text-gray-500">Tipos de EPP</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: 0.06 }}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
            >
              <div className="p-3 bg-red-50 rounded-lg">
                <HardHat className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {catalogo.filter(c => c.stockActual !== undefined && c.stockActual <= 5).length}
                </p>
                <p className="text-sm text-gray-500">Con Stock Bajo</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: 0.12 }}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
            >
              <div className="p-3 bg-blue-50 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {catalogo.length > 0
                    ? `$${(catalogo.reduce((s, c) => s + c.costoUnitario, 0) / catalogo.length).toFixed(0)}`
                    : '—'}
                </p>
                <p className="text-sm text-gray-500">Costo Unitario Promedio</p>
              </div>
            </motion.div>
          </div>

          {/* ── Table ── */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Ítems de EPP registrados</h2>
            </div>

            {catalogo.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <HardHat className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No hay ítems registrados en el catálogo.</p>
                {canEdit && (
                  <p className="text-sm mt-1">
                    Usa el botón «Agregar EPP» para crear el primero.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-left">Nombre</th>
                        <th className="px-4 py-3 text-left">Tipo</th>
                        <th className="px-4 py-3 text-left">Frecuencia Reposición</th>
                        <th className="px-4 py-3 text-right">Costo Unitario</th>
                        <th className="px-4 py-3 text-center">Stock</th>
                        {canEdit && <th className="px-4 py-3 text-center">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pageItems.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-800">{item.nombre}</td>
                          <td className="px-4 py-3 text-gray-600">{item.tipo}</td>
                          <td className="px-4 py-3 text-gray-600">{frecuenciaLabel(item.frecuenciaReposicionDias)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            ${item.costoUnitario.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {stockBadge(item) ?? <span className="text-gray-400 text-xs">—</span>}
                          </td>
                          {canEdit && (
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => openEdit(item)}
                                className="p-1.5 hover:bg-amber-50 rounded-lg transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] text-amber-600"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-100">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Modal ── */}
      <ModalShell isOpen={showModal} onClose={closeModal} maxHeight="max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <HardHat className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {editItem ? 'Editar EPP' : 'Agregar EPP al Catálogo'}
            </h3>
          </div>
          <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg transition-[transform,background-color] duration-150 ease-out active:scale-[0.97]">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Guantes de nitrilo talla M"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${formErrors.nombre ? 'border-red-400' : 'border-gray-300'}`}
            />
            {formErrors.nombre && <p className="text-xs text-red-500 mt-1">{formErrors.nombre}</p>}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo <span className="text-red-500">*</span>
            </label>
            <select
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${formErrors.tipo ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Seleccionar tipo...</option>
              {TIPOS_EPP.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {formErrors.tipo && <p className="text-xs text-red-500 mt-1">{formErrors.tipo}</p>}
          </div>

          {/* Frecuencia reposición */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frecuencia de Reposición <span className="text-red-500">*</span>
            </label>
            <select
              value={form.frecuenciaReposicionDias}
              onChange={e => setForm(f => ({ ...f, frecuenciaReposicionDias: e.target.value }))}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${formErrors.frecuenciaReposicionDias ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Seleccionar frecuencia...</option>
              {FRECUENCIAS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            {formErrors.frecuenciaReposicionDias && (
              <p className="text-xs text-red-500 mt-1">{formErrors.frecuenciaReposicionDias}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              El backend calculará automáticamente la próxima reposición al registrar una entrega.
            </p>
          </div>

          {/* Costo unitario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Costo Unitario (USD) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.costoUnitario}
              onChange={e => setForm(f => ({ ...f, costoUnitario: e.target.value }))}
              placeholder="Ej: 2.50"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${formErrors.costoUnitario ? 'border-red-400' : 'border-gray-300'}`}
            />
            {formErrors.costoUnitario && <p className="text-xs text-red-500 mt-1">{formErrors.costoUnitario}</p>}
          </div>

          {/* Stock actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Actual <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.stockActual}
              onChange={e => setForm(f => ({ ...f, stockActual: e.target.value }))}
              placeholder="Ej: 50"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Se mostrará alerta roja si el stock cae a 5 unidades o menos.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-[transform,background-color] duration-150 ease-out active:scale-[0.97]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] disabled:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editItem ? 'Guardar cambios' : 'Agregar'}
          </button>
        </div>
      </ModalShell>
    </div>
  );
}
