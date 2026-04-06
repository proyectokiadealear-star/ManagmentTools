import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, X, Save, Loader2,
  Tag, Truck, Boxes, Wrench, AlertTriangle,
  Activity, Settings, ShieldCheck, Package, HardHat, FileText, Gavel,
} from 'lucide-react';
import {
  getCatalogos,
  createCatalogoItem,
  updateCatalogoItem,
  deleteCatalogoItem,
  CatalogoItem,
  CatalogoTipo,
} from '../../services/catalogoService';
import {
  getAreas, createArea, deleteArea,
  getBahias, createBahia, deleteBahia,
  getRacks, createRack, deleteRack,
  getCajas, createCaja, deleteCaja,
  AreaAPI, BahiaAPI, RackAPI, CajaAPI,
} from '../../services/assetService';

/* ─────────────── helpers ─────────────── */

/** Solo letras, números, espacios, guiones, barras y puntos. Fuerza mayúsculas. */
function sanitize(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÑÜ\s\-\/\.]/g, '');
}

/* ─────────────── tabs ─────────────── */

type Tab =
  | 'tipo-activo'
  | 'marca'
  | 'proveedor'
  | 'estado-activo'
  | 'estado-operativo'
  | 'tipo-mantenimiento'
  | 'causa-falla'
  | 'categoria-insumo'
  | 'categoria-epp'
  | 'estado-devolucion'
  | 'tipo-cotizacion'
  | 'sancion'
  | 'ubicaciones';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'tipo-activo',        label: 'Tipos de Activo',     icon: Tag },
  { key: 'marca',              label: 'Marcas y Modelos',    icon: Boxes },
  { key: 'proveedor',          label: 'Proveedores',         icon: Truck },
  { key: 'estado-activo',      label: 'Estados Activo',      icon: Activity },
  { key: 'estado-operativo',   label: 'Estados Operativo',   icon: Settings },
  { key: 'tipo-mantenimiento', label: 'Tipos Mantenimiento', icon: Wrench },
  { key: 'causa-falla',        label: 'Causas de Falla',     icon: AlertTriangle },
  { key: 'categoria-insumo',   label: 'Categorías Insumo',   icon: Package },
  { key: 'categoria-epp',      label: 'Categorías EPP',      icon: HardHat },
  { key: 'estado-devolucion',  label: 'Estados Devolución',  icon: ShieldCheck },
  { key: 'tipo-cotizacion',    label: 'Tipos Cotización',    icon: FileText },
  { key: 'sancion',            label: 'Sanciones',           icon: Gavel },
  { key: 'ubicaciones',        label: 'Ubicaciones',         icon: Wrench },
];

/* ════════════════════════════════════════════════════
 *  Componente principal
 * ════════════════════════════════════════════════════ */

export function CatalogosView() {
  const [activeTab, setActiveTab] = useState<Tab>('tipo-activo');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Catálogos</h1>
        <p className="text-sm text-slate-500 mt-1">
          Administre los catálogos dinámicos del sistema. Todos los valores se guardan en MAYÚSCULAS.
        </p>
      </div>

      {/* Tabs — scrollable */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === key
                ? 'bg-white text-amber-600 border border-b-white border-slate-200 -mb-px'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {activeTab === 'marca' ? (
        <MarcaModeloList />
      ) : activeTab === 'ubicaciones' ? (
        <UbicacionesManager />
      ) : (
        <SimpleCatalogList catalogo={activeTab} title={TABS.find(t => t.key === activeTab)?.label ?? activeTab} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
 *  Lista simple de catálogo
 * ════════════════════════════════════════════════════ */

function SimpleCatalogList({ catalogo, title }: { catalogo: CatalogoTipo; title: string }) {
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getCatalogos(catalogo)
      .then(setItems)
      .catch((err) => {
        console.error('[Catalogos] Error cargando', catalogo, err);
        setError(`Error al cargar: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, [catalogo]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const nombre = sanitize(newName);
    if (!nombre || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createCatalogoItem({ catalogo, nombre });
      setNewName('');
      load();
    } catch (err: any) {
      console.error('[Catalogos] Error creando', catalogo, err);
      setError(`Error al crear: ${err.message}`);
    }
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    const nombre = sanitize(editName);
    if (!nombre || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateCatalogoItem(id, { nombre });
      setEditId(null);
      load();
    } catch (err: any) {
      console.error('[Catalogos] Error actualizando', id, err);
      setError(`Error al actualizar: ${err.message}`);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este elemento?')) return;
    setError(null);
    try {
      await deleteCatalogoItem(id);
      load();
    } catch (err: any) {
      console.error('[Catalogos] Error eliminando', id, err);
      setError(`Error al eliminar: ${err.message}`);
    }
  };

  const handleToggle = async (item: CatalogoItem) => {
    setError(null);
    try {
      await updateCatalogoItem(item.id, { activo: !item.activo });
      load();
    } catch (err: any) {
      console.error('[Catalogos] Error toggle', item.id, err);
      setError(`Error al cambiar estado: ${err.message}`);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-400">{items.length} registros</span>
      </div>

      {error && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Agregar nuevo */}
      <div className="px-5 py-3 border-b border-slate-100 flex gap-2">
        <input
          type="text"
          placeholder={`Nuevo ${title.toLowerCase().replace(/s$/, '')}...`}
          value={newName}
          onChange={(e) => setNewName(sanitize(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500 uppercase"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim() || saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 rounded-lg transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Agregar
        </button>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="animate-spin text-amber-500" size={24} />
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">Sin registros. Agrega uno arriba.</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
              {editId === item.id ? (
                <>
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(sanitize(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(item.id)}
                    className="flex-1 px-3 py-1.5 border border-amber-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500 uppercase"
                  />
                  <button onClick={() => handleUpdate(item.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md">
                    <Save size={15} />
                  </button>
                  <button onClick={() => setEditId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md">
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <span className={`flex-1 text-sm ${item.activo ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                    {item.nombre}
                  </span>
                  <button
                    onClick={() => handleToggle(item)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      item.activo
                        ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {item.activo ? 'Activo' : 'Inactivo'}
                  </button>
                  <button
                    onClick={() => { setEditId(item.id); setEditName(item.nombre); }}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
 *  Marcas + Modelos (jerarquía padre/hijo)
 * ════════════════════════════════════════════════════ */

function MarcaModeloList() {
  const [marcas, setMarcas] = useState<CatalogoItem[]>([]);
  const [modelos, setModelos] = useState<CatalogoItem[]>([]);
  const [selectedMarca, setSelectedMarca] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newMarca, setNewMarca] = useState('');
  const [newModelo, setNewModelo] = useState('');
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const loadMarcas = useCallback(() => {
    setLoading(true);
    setError(null);
    getCatalogos('marca')
      .then(setMarcas)
      .catch((err) => {
        console.error('[Catalogos] Error cargando marcas', err);
        setError(`Error al cargar marcas: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadModelos = useCallback((marcaId: string) => {
    getCatalogos('modelo', marcaId)
      .then(setModelos)
      .catch((err) => {
        console.error('[Catalogos] Error cargando modelos', err);
        setModelos([]);
      });
  }, []);

  useEffect(() => { loadMarcas(); }, [loadMarcas]);
  useEffect(() => {
    if (selectedMarca) loadModelos(selectedMarca);
    else setModelos([]);
  }, [selectedMarca, loadModelos]);

  const handleAddMarca = async () => {
    const nombre = sanitize(newMarca);
    if (!nombre || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createCatalogoItem({ catalogo: 'marca', nombre });
      setNewMarca('');
      loadMarcas();
    } catch (err: any) {
      console.error('[Catalogos] Error creando marca', err);
      setError(`Error al crear marca: ${err.message}`);
    }
    setSaving(false);
  };

  const handleAddModelo = async () => {
    const nombre = sanitize(newModelo);
    if (!nombre || !selectedMarca || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createCatalogoItem({ catalogo: 'modelo', nombre, parentId: selectedMarca });
      setNewModelo('');
      loadModelos(selectedMarca);
    } catch (err: any) {
      console.error('[Catalogos] Error creando modelo', err);
      setError(`Error al crear modelo: ${err.message}`);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, type: 'marca' | 'modelo') => {
    if (!confirm('¿Eliminar este elemento?')) return;
    setError(null);
    try {
      await deleteCatalogoItem(id);
      if (type === 'marca') {
        if (selectedMarca === id) { setSelectedMarca(null); setModelos([]); }
        loadMarcas();
      } else if (selectedMarca) {
        loadModelos(selectedMarca);
      }
    } catch (err: any) {
      console.error('[Catalogos] Error eliminando', id, err);
      setError(`Error al eliminar: ${err.message}`);
    }
  };

  const handleUpdate = async (id: string, type: 'marca' | 'modelo') => {
    const nombre = sanitize(editName);
    if (!nombre || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateCatalogoItem(id, { nombre });
      setEditId(null);
      if (type === 'marca') loadMarcas();
      else if (selectedMarca) loadModelos(selectedMarca);
    } catch (err: any) {
      console.error('[Catalogos] Error actualizando', id, err);
      setError(`Error al actualizar: ${err.message}`);
    }
    setSaving(false);
  };

  const selectedMarcaNombre = marcas.find(m => m.id === selectedMarca)?.nombre;

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-5 py-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Columna Marcas */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Marcas</h3>
          </div>
          <div className="px-5 py-3 border-b border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder="Nueva marca..."
              value={newMarca}
              onChange={(e) => setNewMarca(sanitize(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMarca()}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500 uppercase"
            />
            <button
              onClick={handleAddMarca}
              disabled={!newMarca.trim() || saving}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 rounded-lg transition-colors"
            >
              <Plus size={14} /> Agregar
            </button>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={24} /></div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {marcas.length === 0 && (
                <li className="p-6 text-center text-sm text-slate-400">Sin marcas registradas.</li>
              )}
              {marcas.map((m) => (
                <li
                  key={m.id}
                  className={`px-5 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                    selectedMarca === m.id ? 'bg-amber-50 border-l-2 border-amber-500' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedMarca(m.id)}
                >
                  {editId === m.id ? (
                    <>
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(sanitize(e.target.value))}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(m.id, 'marca')}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-3 py-1.5 border border-amber-300 rounded-md text-sm uppercase"
                      />
                      <button onClick={(e) => { e.stopPropagation(); handleUpdate(m.id, 'marca'); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md"><Save size={15} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setEditId(null); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"><X size={15} /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium text-slate-900">{m.nombre}</span>
                      <button onClick={(e) => { e.stopPropagation(); setEditId(m.id); setEditName(m.nombre); }} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md"><Pencil size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id, 'marca'); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md"><Trash2 size={14} /></button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Columna Modelos */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">
              Modelos {selectedMarcaNombre && <span className="text-amber-600">— {selectedMarcaNombre}</span>}
            </h3>
          </div>
          {selectedMarca ? (
            <>
              <div className="px-5 py-3 border-b border-slate-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Nuevo modelo..."
                  value={newModelo}
                  onChange={(e) => setNewModelo(sanitize(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddModelo()}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500 uppercase"
                />
                <button
                  onClick={handleAddModelo}
                  disabled={!newModelo.trim() || saving}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 rounded-lg transition-colors"
                >
                  <Plus size={14} /> Agregar
                </button>
              </div>
              {modelos.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">Sin modelos para esta marca.</div>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {modelos.map((m) => (
                    <li key={m.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                      {editId === m.id ? (
                        <>
                          <input autoFocus value={editName} onChange={(e) => setEditName(sanitize(e.target.value))} onKeyDown={(e) => e.key === 'Enter' && handleUpdate(m.id, 'modelo')} className="flex-1 px-3 py-1.5 border border-amber-300 rounded-md text-sm uppercase" />
                          <button onClick={() => handleUpdate(m.id, 'modelo')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md"><Save size={15} /></button>
                          <button onClick={() => setEditId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"><X size={15} /></button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-slate-900">{m.nombre}</span>
                          <button onClick={() => { setEditId(m.id); setEditName(m.nombre); }} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(m.id, 'modelo')} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md"><Trash2 size={14} /></button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-sm text-slate-400">
              ← Seleccione una marca para ver sus modelos
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
 *  Gestión de Ubicaciones (Áreas → Bahías → Racks → Cajas)
 * ════════════════════════════════════════════════════ */

function UbicacionesManager() {
  const [areas, setAreas] = useState<AreaAPI[]>([]);
  const [bahias, setBahias] = useState<BahiaAPI[]>([]);
  const [racks, setRacks] = useState<RackAPI[]>([]);
  const [cajas, setCajas] = useState<CajaAPI[]>([]);

  const [selArea, setSelArea] = useState<string | null>(null);
  const [selBahia, setSelBahia] = useState<string | null>(null);
  const [selRack, setSelRack] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newArea, setNewArea] = useState('');
  const [newBahia, setNewBahia] = useState('');
  const [newRack, setNewRack] = useState('');
  const [newCaja, setNewCaja] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAreas = useCallback(() => {
    setLoading(true);
    setError(null);
    getAreas()
      .then(setAreas)
      .catch((err) => {
        console.error('[Ubicaciones] Error cargando áreas', err);
        setError(`Error al cargar áreas: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAreas(); }, [loadAreas]);
  useEffect(() => {
    if (selArea) getBahias(selArea).then(setBahias).catch((err) => { console.error('[Ubicaciones] Error bahías', err); setBahias([]); });
    else { setBahias([]); setSelBahia(null); }
  }, [selArea]);
  useEffect(() => {
    if (selBahia) getRacks(selBahia).then(setRacks).catch((err) => { console.error('[Ubicaciones] Error racks', err); setRacks([]); });
    else { setRacks([]); setSelRack(null); }
  }, [selBahia]);
  useEffect(() => {
    if (selRack) getCajas(selRack).then(setCajas).catch((err) => { console.error('[Ubicaciones] Error cajas', err); setCajas([]); });
    else setCajas([]);
  }, [selRack]);

  const handleAddArea = async () => {
    const nombre = sanitize(newArea);
    if (!nombre || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createArea({ nombre } as Partial<AreaAPI>);
      setNewArea('');
      loadAreas();
    } catch (err: any) {
      console.error('[Ubicaciones] Error creando área', err);
      setError(`Error al crear área: ${err.message}`);
    }
    setSaving(false);
  };

  const handleDeleteArea = async (id: string) => {
    if (!confirm('¿Eliminar esta área?')) return;
    setError(null);
    try {
      await deleteArea(id);
      if (selArea === id) { setSelArea(null); setBahias([]); setRacks([]); setCajas([]); }
      loadAreas();
    } catch (err: any) {
      console.error('[Ubicaciones] Error eliminando área', err);
      setError(`Error al eliminar área: ${err.message}`);
    }
  };

  const handleAddBahia = async () => {
    const nombre = sanitize(newBahia);
    if (!nombre || !selArea || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createBahia({ areaId: selArea, nombre, numero: bahias.length + 1 } as Partial<BahiaAPI>);
      setNewBahia('');
      getBahias(selArea).then(setBahias);
    } catch (err: any) {
      console.error('[Ubicaciones] Error creando bahía', err);
      setError(`Error al crear bahía: ${err.message}`);
    }
    setSaving(false);
  };

  const handleDeleteBahia = async (id: string) => {
    if (!confirm('¿Eliminar esta bahía?')) return;
    setError(null);
    try {
      await deleteBahia(id);
      if (selBahia === id) { setSelBahia(null); setRacks([]); setCajas([]); }
      if (selArea) getBahias(selArea).then(setBahias);
    } catch (err: any) {
      console.error('[Ubicaciones] Error eliminando bahía', err);
      setError(`Error al eliminar bahía: ${err.message}`);
    }
  };

  const handleAddRack = async () => {
    const nombre = sanitize(newRack);
    if (!nombre || !selBahia || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createRack({ bahiaId: selBahia, areaId: selArea!, nombre } as Partial<RackAPI>);
      setNewRack('');
      getRacks(selBahia).then(setRacks);
    } catch (err: any) {
      console.error('[Ubicaciones] Error creando rack', err);
      setError(`Error al crear rack: ${err.message}`);
    }
    setSaving(false);
  };

  const handleDeleteRack = async (id: string) => {
    if (!confirm('¿Eliminar este rack?')) return;
    setError(null);
    try {
      await deleteRack(id);
      if (selRack === id) { setSelRack(null); setCajas([]); }
      if (selBahia) getRacks(selBahia).then(setRacks);
    } catch (err: any) {
      console.error('[Ubicaciones] Error eliminando rack', err);
      setError(`Error al eliminar rack: ${err.message}`);
    }
  };

  const handleAddCaja = async () => {
    const numero = sanitize(newCaja);
    if (!numero || !selRack || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createCaja({ rackId: selRack, numero, estado: 'disponible' } as Partial<CajaAPI>);
      setNewCaja('');
      getCajas(selRack).then(setCajas);
    } catch (err: any) {
      console.error('[Ubicaciones] Error creando caja', err);
      setError(`Error al crear caja: ${err.message}`);
    }
    setSaving(false);
  };

  const handleDeleteCaja = async (id: string) => {
    if (!confirm('¿Eliminar esta caja?')) return;
    setError(null);
    try {
      await deleteCaja(id);
      if (selRack) getCajas(selRack).then(setCajas);
    } catch (err: any) {
      console.error('[Ubicaciones] Error eliminando caja', err);
      setError(`Error al eliminar caja: ${err.message}`);
    }
  };

  const selAreaNombre = areas.find(a => a.id === selArea)?.nombre;
  const selBahiaNombre = bahias.find(b => b.id === selBahia)?.nombre;
  const selRackNombre = racks.find(r => r.id === selRack)?.nombre;

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-5 py-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2">
        <span className="font-medium text-blue-700">Jerarquía:</span>
        <span className={selArea ? 'text-blue-700 font-medium' : ''}>Área{selAreaNombre ? ` (${selAreaNombre})` : ''}</span>
        <span>→</span>
        <span className={selBahia ? 'text-blue-700 font-medium' : ''}>Bahía{selBahiaNombre ? ` (${selBahiaNombre})` : ''}</span>
        <span>→</span>
        <span className={selRack ? 'text-blue-700 font-medium' : ''}>Rack{selRackNombre ? ` (${selRackNombre})` : ''}</span>
        <span>→</span>
        <span>Caja</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <LocationColumn
          title="Áreas"
          items={areas.map(a => ({ id: a.id, label: a.nombre }))}
          selected={selArea}
          onSelect={(id) => { setSelArea(id); setSelBahia(null); setSelRack(null); }}
          newValue={newArea}
          onNewChange={(v) => setNewArea(sanitize(v))}
          onAdd={handleAddArea}
          onDelete={handleDeleteArea}
          loading={loading}
          saving={saving}
        />
        <LocationColumn
          title="Bahías"
          items={bahias.map(b => ({ id: b.id, label: b.nombre }))}
          selected={selBahia}
          onSelect={(id) => { setSelBahia(id); setSelRack(null); }}
          newValue={newBahia}
          onNewChange={(v) => setNewBahia(sanitize(v))}
          onAdd={handleAddBahia}
          onDelete={handleDeleteBahia}
          disabled={!selArea}
          disabledMsg="Seleccione un área"
          saving={saving}
        />
        <LocationColumn
          title="Racks"
          items={racks.map(r => ({ id: r.id, label: r.nombre }))}
          selected={selRack}
          onSelect={setSelRack}
          newValue={newRack}
          onNewChange={(v) => setNewRack(sanitize(v))}
          onAdd={handleAddRack}
          onDelete={handleDeleteRack}
          disabled={!selBahia}
          disabledMsg="Seleccione una bahía"
          saving={saving}
        />
        <LocationColumn
          title="Cajas / Posiciones"
          items={cajas.map(c => ({ id: c.id, label: c.numero }))}
          selected={null}
          onSelect={() => {}}
          newValue={newCaja}
          onNewChange={(v) => setNewCaja(sanitize(v))}
          onAdd={handleAddCaja}
          onDelete={handleDeleteCaja}
          disabled={!selRack}
          disabledMsg="Seleccione un rack"
          saving={saving}
        />
      </div>
    </div>
  );
}

/* ─── Columna reutilizable de ubicación ─── */

interface LocationColumnProps {
  title: string;
  items: { id: string; label: string }[];
  selected: string | null;
  onSelect: (id: string) => void;
  newValue: string;
  onNewChange: (v: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  loading?: boolean;
  disabled?: boolean;
  disabledMsg?: string;
  saving: boolean;
}

function LocationColumn({
  title, items, selected, onSelect, newValue, onNewChange, onAdd, onDelete,
  loading, disabled, disabledMsg, saving,
}: LocationColumnProps) {
  if (disabled) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden opacity-60">
        <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-900">{title}</div>
        <div className="p-6 text-center text-xs text-slate-400">{disabledMsg}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-900">{title}</div>
      <div className="px-3 py-2 border-b border-slate-100 flex gap-1">
        <input
          type="text"
          placeholder="Nuevo..."
          value={newValue}
          onChange={(e) => onNewChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          className="flex-1 px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-amber-500 focus:border-amber-500 uppercase"
        />
        <button
          onClick={onAdd}
          disabled={!newValue.trim() || saving}
          className="p-1.5 text-white bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 rounded-md"
        >
          <Plus size={14} />
        </button>
      </div>
      {loading ? (
        <div className="p-6 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={20} /></div>
      ) : items.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400">Vacío</div>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`px-4 py-2.5 flex items-center gap-2 cursor-pointer text-sm transition-colors ${
                selected === item.id ? 'bg-amber-50 border-l-2 border-amber-500 font-medium text-amber-800' : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span className="flex-1 truncate">{item.label}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-opacity"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
