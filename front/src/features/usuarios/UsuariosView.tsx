// UsuariosView.tsx — Administración de usuarios (solo Jefe de Taller)
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Plus, Edit, Trash2, ToggleLeft, ToggleRight,
  Search, RefreshCw, ShieldCheck, ShieldOff,
} from 'lucide-react';
import {
  Usuario,
  getUsuarios,
  desactivarUsuario,
  activarUsuario,
  deleteUsuario,
} from '../../services/usuariosService';
import { AREA_LABELS, SEDE_LABELS } from '@shared/types/enums';
import { UsuarioFormModal } from './UsuarioFormModal';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de presentación
// ─────────────────────────────────────────────────────────────────────────────
const ROL_LABEL: Record<Usuario['rol'], string> = {
  personal: 'Personal de Taller',
  tecnico:  'Técnico Líder',
  jefe:     'Jefe de Taller',
};

const ROL_COLOR: Record<Usuario['rol'], string> = {
  personal: 'bg-slate-100 text-slate-700',
  tecnico:  'bg-blue-100 text-blue-700',
  jefe:     'bg-amber-100 text-amber-700',
};

// Skeleton row
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export function UsuariosView() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterRol, setFilterRol] = useState<Usuario['rol'] | ''>('');
  const [filterActivo, setFilterActivo] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  // Modal
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState<Usuario | null>(null);

  // Confirmación eliminar
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Carga ──────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const data = await getUsuarios();
      setUsuarios(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Filtros ────────────────────────────────────────────────────────────────
  const filtered = usuarios.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchRol    = !filterRol || u.rol === filterRol;
    const matchActivo =
      filterActivo === 'todos' ||
      (filterActivo === 'activos'   && u.activo) ||
      (filterActivo === 'inactivos' && !u.activo);
    return matchSearch && matchRol && matchActivo;
  });

  // ── Acciones ───────────────────────────────────────────────────────────────
  const handleToggleActivo = async (u: Usuario) => {
    const updated = u.activo ? await desactivarUsuario(u.id) : await activarUsuario(u.id);
    setUsuarios((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteUsuario(deleteId);
    setUsuarios((prev) => prev.filter((x) => x.id !== deleteId));
    setDeleteId(null);
  };

  const handleSaved = (saved: Usuario) => {
    setUsuarios((prev) => {
      const exists = prev.find((u) => u.id === saved.id);
      return exists
        ? prev.map((u) => (u.id === saved.id ? saved : u))
        : [saved, ...prev];
    });
  };

  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit   = (u: Usuario) => { setEditTarget(u); setModalOpen(true); };

  // ── Estadísticas rápidas ───────────────────────────────────────────────────
  const total    = usuarios.length;
  const activos  = usuarios.filter((u) => u.activo).length;
  const jefes    = usuarios.filter((u) => u.rol === 'jefe').length;
  const tecnicos = usuarios.filter((u) => u.rol === 'tecnico').length;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-sm">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Usuarios del Sistema</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gestión de accesos y roles — SURMOTOR</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={15} />
            Actualizar
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nuevo usuario
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',     value: total,    color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Activos',   value: activos,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Técnicos',  value: tecnicos, color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Jefes',     value: jefes,    color: 'text-amber-600',  bg: 'bg-amber-50' },
        ].map((k) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${k.bg} rounded-xl p-4 border border-white shadow-sm`}
          >
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{k.label}</p>
            <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Filtro rol */}
        <select
          value={filterRol}
          onChange={(e) => setFilterRol(e.target.value as Usuario['rol'] | '')}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Todos los roles</option>
          <option value="personal">Personal de Taller</option>
          <option value="tecnico">Técnico Líder</option>
          <option value="jefe">Jefe de Taller</option>
        </select>

        {/* Filtro activo */}
        <select
          value={filterActivo}
          onChange={(e) => setFilterActivo(e.target.value as typeof filterActivo)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="todos">Todos</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>

        <span className="text-xs text-slate-400 ml-auto">{filtered.length} resultado(s)</span>
      </div>

      {/* ── Tabla ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sede</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Área</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        No se encontraron usuarios con los filtros aplicados.
                      </td>
                    </tr>
                  )
                  : filtered.map((u) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Usuario */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                            {u.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{u.nombre}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROL_COLOR[u.rol]}`}>
                          {ROL_LABEL[u.rol]}
                        </span>
                      </td>

                      {/* Sede */}
                      <td className="px-4 py-3 text-slate-600">
                        {SEDE_LABELS[u.sede]}
                      </td>

                      {/* Área */}
                      <td className="px-4 py-3 text-slate-600">
                        {AREA_LABELS[u.area]}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                            u.activo
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {u.activo
                            ? <ShieldCheck size={12} />
                            : <ShieldOff size={12} />}
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle activo */}
                          <button
                            onClick={() => handleToggleActivo(u)}
                            title={u.activo ? 'Desactivar' : 'Activar'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.activo
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {u.activo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => openEdit(u)}
                            title="Editar"
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          >
                            <Edit size={16} />
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => setDeleteId(u.id)}
                            title="Eliminar"
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal crear/editar ── */}
      <UsuarioFormModal
        isOpen={modalOpen}
        usuario={editTarget}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />

      {/* ── Confirm eliminar ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-2">¿Eliminar usuario?</h3>
            <p className="text-sm text-slate-500 mb-5">
              Esta acción no se puede deshacer. El usuario perderá acceso al sistema.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
