// UsuarioFormModal.tsx — Modal para crear / editar un usuario
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Eye, EyeOff, Copy, Check } from 'lucide-react';
import {
  Usuario,
  CreateUsuarioPayload,
  CreateUsuarioResponse,
  createUsuario,
  updateUsuario,
} from '../../services/usuariosService';
import {
  AreaTaller,
  Sede,
  AREAS_OPTIONS,
  SEDES_OPTIONS,
} from '@shared/types/enums';
import { getAreas, AreaAPI } from '../../services/assetService';

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

type FormState = CreateUsuarioPayload;

const DEFAULT: FormState = {
  nombre:  '',
  email:   '',
  rol:     'personal',
  sede:    Sede.SURMOTOR,
  area:    AreaTaller.TALLER,
  activo:  true,
  fotoUrl: '',
  password: '',
};

export function UsuarioFormModal({ isOpen, usuario, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [areasFromAPI, setAreasFromAPI] = useState<AreaAPI[]>([]);

  // Cuando se abre el modal, cargar datos del usuario a editar (o limpiar)
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setGeneratedPassword(null);
      setCopied(false);
      getAreas().then(setAreasFromAPI).catch(() => {});
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

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCopyPassword = async () => {
    if (generatedPassword) {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim()) {
      setError('Nombre y email son obligatorios.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (usuario) {
        // Editar — no enviar password
        const { password: _pw, ...updatePayload } = form;
        const saved = await updateUsuario(usuario.id, updatePayload);
        onSaved(saved);
        onClose();
      } else {
        // Crear — puede incluir password
        const payload: CreateUsuarioPayload = { ...form };
        if (!payload.password?.trim()) {
          delete payload.password; // Se auto-generará en backend
        }
        const response: CreateUsuarioResponse = await createUsuario(payload);

        if (response.passwordGenerado) {
          // Mostrar la contraseña generada antes de cerrar
          setGeneratedPassword(response.passwordGenerado);
          onSaved(response);
        } else {
          onSaved(response);
          onClose();
        }
      }
    } catch {
      setError('Error al guardar. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const sedeAreas = areasFromAPI.filter(a => !a.sede || a.sede === form.sede);
  const areaOptions = sedeAreas.length > 0
    ? sedeAreas.map(a => ({ value: a.tipo ?? a.nombre, label: a.nombre }))
    : AREAS_OPTIONS;

  // Vista de "contraseña generada" — se muestra después de crear el usuario
  if (generatedPassword) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Check size={20} className="text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Usuario creado exitosamente
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Se generó una contraseña temporal para <strong>{form.email}</strong>.
                  Comuníquela al usuario para que pueda iniciar sesión.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Contraseña generada
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-lg font-mono font-semibold text-slate-900 tracking-wider">
                      {generatedPassword}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Copiar contraseña"
                    >
                      {copied ? (
                        <Check size={18} className="text-emerald-600" />
                      ) : (
                        <Copy size={18} className="text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ Esta contraseña no se mostrará de nuevo. Asegúrese de copiarla antes de cerrar.
                </p>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Entendido, cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

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

              {/* Password — solo para nuevos usuarios */}
              {!usuario && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password || ''}
                      onChange={(e) => set('password', e.target.value)}
                      placeholder="Dejar vacío para generar automáticamente"
                      className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff size={16} className="text-slate-400" />
                      ) : (
                        <Eye size={16} className="text-slate-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Si no ingresa una contraseña, se generará una automática (ej: Surmotor1234#)
                  </p>
                </div>
              )}

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
                    onChange={(e) => {
                      const newSede = e.target.value as Sede;
                      set('sede', newSede);
                      const first = areasFromAPI.find(a => !a.sede || a.sede === newSede);
                      if (first) set('area', (first.tipo ?? first.nombre) as AreaTaller);
                    }}
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
                    {areaOptions.map((o) => (
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
