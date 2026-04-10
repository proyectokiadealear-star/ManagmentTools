import { useState, useEffect } from 'react';
import { FlaskConical, PlusCircle, Pencil, X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useRole } from '@shared/context/AssetContext';
import { ModalShell } from '@shared/components';
import {
  getCatalogoInsumos,
  addCatalogoInsumo,
  updateCatalogoInsumo,
  type CatalogoInsumo,
} from '../../services/consumablesService';

// ─── Opciones fijas ────────────────────────────────────────────────────────

const TIPOS = ['lubricante', 'filtro', 'pintura', 'barniz', 'lija', 'masking', 'refrigerante', 'frenos', 'eléctrico', 'otro'];
const UNIDADES = ['litros', 'galones', 'unidades', 'pares', 'rollos', 'metros', 'kg'];

// ─── Formulario en blanco ─────────────────────────────────────────────────

const BLANK_FORM = {
  nombre: '',
  tipo: '',
  codigo: '',
  unidadMedida: '',
  costoUnitario: '',
  consumoPromedioPorOT: '',
  stockActual: '',
  stockMinimo: '',
};

type FormState = typeof BLANK_FORM;

// ─── Component ────────────────────────────────────────────────────────────

export function InsumosCatalog() {
  const role = useRole();
  const canEdit = role === 'jefe' || role === 'tecnico';

  const [catalogo, setCatalogo] = useState<CatalogoInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<CatalogoInsumo | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Load catalog ────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    getCatalogoInsumos()
      .then(data => setCatalogo(data))
      .catch(() => setFetchError('No se pudo cargar el catálogo de insumos'))
      .finally(() => setLoading(false));
  }, []);

  // ── Modal helpers ───────────────────────────────────────────────────────

  function openAdd() {
    setEditTarget(null);
    setForm(BLANK_FORM);
    setFormErrors({});
    setSaveError(null);
    setShowModal(true);
  }

  function openEdit(item: CatalogoInsumo) {
    setEditTarget(item);
    setForm({
      nombre: item.nombre,
      tipo: item.tipo,
      codigo: item.codigo,
      unidadMedida: item.unidadMedida,
      costoUnitario: String(item.costoUnitario),
      consumoPromedioPorOT: String(item.consumoPromedioPorOT),
      stockActual: item.stockActual != null ? String(item.stockActual) : '',
      stockMinimo: item.stockMinimo != null ? String(item.stockMinimo) : '',
    });
    setFormErrors({});
    setSaveError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditTarget(null);
    setForm(BLANK_FORM);
    setFormErrors({});
    setSaveError(null);
  }

  // ── Validation ──────────────────────────────────────────────────────────

  function validate(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.nombre.trim()) errors.nombre = 'Requerido';
    if (!form.tipo) errors.tipo = 'Seleccione un tipo';
    if (!form.codigo.trim()) errors.codigo = 'Requerido';
    if (!form.unidadMedida) errors.unidadMedida = 'Seleccione unidad';
    if (!form.costoUnitario || Number(form.costoUnitario) <= 0)
      errors.costoUnitario = 'Ingrese un valor mayor a 0';
    if (!form.consumoPromedioPorOT || Number(form.consumoPromedioPorOT) < 0)
      errors.consumoPromedioPorOT = 'Ingrese un valor ≥ 0';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Save ────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);

    const payload: Omit<CatalogoInsumo, 'id'> = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      codigo: form.codigo.trim().toUpperCase(),
      unidadMedida: form.unidadMedida,
      costoUnitario: Number(form.costoUnitario),
      consumoPromedioPorOT: Number(form.consumoPromedioPorOT),
      ...(form.stockActual !== '' ? { stockActual: Number(form.stockActual) } : {}),
      ...(form.stockMinimo !== '' ? { stockMinimo: Number(form.stockMinimo) } : {}),
    };

    try {
      if (editTarget) {
        const updated = await updateCatalogoInsumo(editTarget.id, payload);
        setCatalogo(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      } else {
        const created = await addCatalogoInsumo(payload);
        setCatalogo(prev => [...prev, created]);
      }
      closeModal();
    } catch {
      setSaveError('Error al guardar. Verifique los datos e intente nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  // ── Stock badge ─────────────────────────────────────────────────────────

  function StockBadge({ item }: { item: CatalogoInsumo }) {
    if (item.stockActual == null) return <span className="text-gray-400 text-xs">—</span>;
    const low = item.stockMinimo != null && item.stockActual < item.stockMinimo;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        low ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
      }`}>
        {low ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
        {item.stockActual} {item.unidadMedida}
      </span>
    );
  }

  // ── Field helper ────────────────────────────────────────────────────────

  function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }

  const inputCls = (err?: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${
      err ? 'border-red-400' : 'border-gray-300'
    }`;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <FlaskConical className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Catálogo de Insumos</h1>
            <p className="text-sm text-gray-500">
              Registra los insumos disponibles antes de registrar consumos
            </p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg transition-[transform,background-color] duration-150 ease-out active:scale-[0.97]"
          >
            <PlusCircle size={18} />
            Agregar insumo
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          <p className="text-sm text-gray-500">Cargando catálogo…</p>
        </div>
      )}

      {/* Error */}
      {!loading && fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          {fetchError}
        </div>
      )}

      {/* Empty */}
      {!loading && !fetchError && catalogo.length === 0 && (
        <div className="bg-white border-2 border-dashed border-amber-200 rounded-xl py-16 flex flex-col items-center gap-3">
          <FlaskConical className="h-10 w-10 text-amber-300" />
          <p className="text-gray-500 font-medium">No hay insumos registrados aún</p>
          {canEdit && (
            <button
              onClick={openAdd}
              className="mt-2 text-sm font-semibold text-amber-600 hover:underline"
            >
              Agregar el primer insumo →
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && !fetchError && catalogo.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-700">
              {catalogo.length} insumo{catalogo.length !== 1 ? 's' : ''} registrado{catalogo.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Nombre', 'Tipo', 'Código', 'Unidad', 'Costo unit.', 'Prom. x OT', 'Stock actual', 'Stock mín.', ...(canEdit ? [''] : [])].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {catalogo.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{item.nombre}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">
                        {item.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{item.codigo}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.unidadMedida}</td>
                    <td className="px-4 py-2.5 text-gray-800 font-semibold">
                      ${item.costoUnitario.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {item.consumoPromedioPorOT} {item.unidadMedida}
                    </td>
                    <td className="px-4 py-2.5">
                      <StockBadge item={item} />
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {item.stockMinimo != null ? `${item.stockMinimo} ${item.unidadMedida}` : '—'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-gray-400 hover:text-amber-600 transition-[transform,color] duration-150 ease-out active:scale-[0.97]"
                          title="Editar insumo"
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      <ModalShell isOpen={showModal} onClose={closeModal} maxHeight="max-h-[90vh]">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">
            {editTarget ? 'Editar insumo' : 'Agregar insumo al catálogo'}
          </h3>
          <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-[transform,color] duration-150 ease-out active:scale-[0.97]">
            <X size={20} />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-6 py-4 space-y-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Nombre *" error={formErrors.nombre}>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. Aceite motor 5W-30"
                  className={inputCls(formErrors.nombre)}
                />
              </Field>
            </div>

            <Field label="Tipo *" error={formErrors.tipo}>
              <select
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className={inputCls(formErrors.tipo)}
              >
                <option value="">Seleccionar…</option>
                {TIPOS.map(t => (
                  <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </Field>

            <Field label="Código interno *" error={formErrors.codigo}>
              <input
                type="text"
                value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                placeholder="Ej. INS-LUB-001"
                className={inputCls(formErrors.codigo)}
              />
            </Field>

            <Field label="Unidad de medida *" error={formErrors.unidadMedida}>
              <select
                value={form.unidadMedida}
                onChange={e => setForm(f => ({ ...f, unidadMedida: e.target.value }))}
                className={inputCls(formErrors.unidadMedida)}
              >
                <option value="">Seleccionar…</option>
                {UNIDADES.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Field>

            <Field label="Costo unitario ($) *" error={formErrors.costoUnitario}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.costoUnitario}
                onChange={e => setForm(f => ({ ...f, costoUnitario: e.target.value }))}
                placeholder="0.00"
                className={inputCls(formErrors.costoUnitario)}
              />
            </Field>

            <Field label="Consumo promedio por OT *" error={formErrors.consumoPromedioPorOT}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.consumoPromedioPorOT}
                onChange={e => setForm(f => ({ ...f, consumoPromedioPorOT: e.target.value }))}
                placeholder="Ej. 2.5"
                className={inputCls(formErrors.consumoPromedioPorOT)}
              />
            </Field>

            <Field label="Stock actual" error={formErrors.stockActual}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.stockActual}
                onChange={e => setForm(f => ({ ...f, stockActual: e.target.value }))}
                placeholder="Opcional"
                className={inputCls()}
              />
            </Field>

            <Field label="Stock mínimo (alerta)" error={formErrors.stockMinimo}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.stockMinimo}
                onChange={e => setForm(f => ({ ...f, stockMinimo: e.target.value }))}
                placeholder="Opcional"
                className={inputCls()}
              />
            </Field>
          </div>

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={closeModal}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.97] disabled:active:scale-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] disabled:active:scale-100 disabled:opacity-50"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {editTarget ? 'Guardar cambios' : 'Agregar insumo'}
          </button>
        </div>
      </ModalShell>
    </div>
  );
}
