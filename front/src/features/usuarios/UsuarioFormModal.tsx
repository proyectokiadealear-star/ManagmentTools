// UsuarioFormModal.tsx — Modal para crear / editar un usuario
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User } from 'lucide-react';
import {
  Usuario,
  CreateUsuarioPayload,
  createUsuario,
  updateUsuario,
} from '../../services/usuariosService';
import {
  AreaTaller,
  Sede,
  AREAS_OPTIONS,
  SEDES_OPTIONS,
} from '@shared/types/enums';

interface Props {
  isOpen: boolean;
  usuario: Usuario | null; // null = crear nuevo
  onClose: () => void;
  onSaved: (u: Usuario) => void;
}

const ROL_OPTIONS: { value: Usuario['rol']; label: string }[] = [
  { value: 'personal', label: 'Personal de Taller' },
  { value: 'tecnico', label: 'Técnico Líder' },
  { value: 'jefe',    label: 'Jefe de Taller' },
];

const DEFAULT: CreateUsuarioPayload = {
  nombre:  '',
  email:   '',
  rol:     'personal',
  sede:    Sede.SURMOTOR,
  area:    AreaTaller.TALLER,
  activo:  true,
  fotoUrl: '',
};

export function UsuarioFormModal({ isOpen, usuario, onClose, onSaved }: Props) {
  const [form, setForm] = useState<CreateUsuarioPayload>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cuando se abre el modal, cargar datos del usuario a editar (o limpiar)
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (usuario) {
        setForm({
          nombre:  usuario.nombre,
          email:   usuario.email,
          rol:     usuario.rol,
          sede:    usuario.sede,
          area:    usuario.area,
          activo:  usuario.activo,
          fotoUrl: usuario.fotoUrl ?? '',
        });
      } else {
        setForm(DEFAULT);
      }
    }
  }, [isOpen, usuario]);

  const set = <K extends keyof CreateUsuarioPayload>(key: K, value: CreateUsuarioPayload[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim()) {
      setError('Nombre y email son obligatorios.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const saved = usuario
        ? await updateUsuario(usuario.id, form)
        : await createUsuario(form);
      onSaved(saved);
      onClose();
    } catch {
      setError('Error al guardar. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <User size={20} className="text-indigo-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {usuario ? 'Editar usuario' : 'Nuevo usuario'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                  placeholder="Ej: Carlos Mendoza"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="Ej: cmendoza@surmotor.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select
                  value={form.rol}
                  onChange={(e) => set('rol', e.target.value as Usuario['rol'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  {ROL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Sede + Área — lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sede</label>
                  <select
                    value={form.sede}
                    onChange={(e) => set('sede', e.target.value as Sede)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {SEDES_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Área</label>
                  <select
                    value={form.area}
                    onChange={(e) => set('area', e.target.value as AreaTaller)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {AREAS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Activo toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set('activo', !form.activo)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.activo ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.activo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-slate-700">
                  {form.activo ? 'Usuario activo' : 'Usuario inactivo'}
                </span>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  <Save size={16} />
                  {loading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
