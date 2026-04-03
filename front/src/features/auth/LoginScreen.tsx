import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';

export function LoginScreen() {
  const { login, loading, error } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password.trim()) {
      setLocalError('Por favor ingresa tu email y contraseña.');
      return;
    }

    try {
      await login(email.trim(), password);
      // Navigation is handled by App.tsx after auth state updates
    } catch {
      // error already set in AuthContext
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-2xl mb-4 shadow-lg shadow-amber-500/30">
          <Wrench size={32} className="text-slate-900" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">SURMOTOR</h1>
        <p className="text-slate-400 mt-1 text-sm font-medium uppercase tracking-widest">
          Sistema de Gestión de Activos
        </p>
      </motion.div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 24 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8"
      >
        <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">Iniciar Sesión</h2>

        {/* Error Banner */}
        {displayError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5"
          >
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{displayError}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="usuario@surmotor.com"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-900 font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-500/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Iniciando…
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-slate-500 text-xs text-center"
      >
        Acceso restringido — solo personal autorizado de SURMOTOR
      </motion.p>
    </div>
  );
}
