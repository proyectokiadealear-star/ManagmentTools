import { motion } from 'framer-motion';
import { Wrench } from 'lucide-react';
import type { UserRole } from '@shared/types/roles';
import { roleProfiles } from '@shared/types/roles';

export type { UserRole } from '@shared/types/roles';
export type { RoleProfile } from '@shared/types/roles';
export { roleProfiles } from '@shared/types/roles';

interface LoginScreenProps {
  onSelectRole: (role: UserRole) => void;
}

export function LoginScreen({ onSelectRole }: LoginScreenProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-2xl mb-4 shadow-lg shadow-amber-500/30">
          <Wrench size={32} className="text-slate-900" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">SURMOTOR</h1>
        <p className="text-slate-400 mt-1 text-sm font-medium uppercase tracking-widest">
          Sistema de Gestión de Activos
        </p>
        <div className="mt-4 inline-block bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-1.5 rounded-full font-medium">
          Prototipo de Evaluación — Selecciona tu perspectiva
        </div>
      </motion.div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">
        {roleProfiles.map((profile, i) => {
          const Icon = profile.icon;
          return (
            <motion.button
              key={profile.role}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * (i + 1), type: 'spring', stiffness: 260, damping: 22 }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectRole(profile.role)}
              className={`group bg-white rounded-2xl p-6 text-left shadow-xl border-2 ${profile.borderColor} hover:shadow-2xl transition-all duration-200 cursor-pointer`}
            >
              {/* Avatar + Badge */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-xl ${profile.bgColor} border ${profile.borderColor} flex items-center justify-center shadow-sm`}>
                  <Icon size={28} className={profile.color} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-base">{profile.nombre}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${profile.bgColor} ${profile.color} border ${profile.borderColor}`}>
                    {profile.cargo}
                  </span>
                </div>
              </div>

              {/* Descripción */}
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">{profile.descripcion}</p>

              {/* Accesos */}
              <ul className="space-y-1.5">
                {profile.accesos.map((acceso) => (
                  <li key={acceso} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${profile.bgColor.replace('bg-', 'bg-').replace('-50', '-400')}`}
                      style={{ background: profile.role === 'personal' ? '#60a5fa' : profile.role === 'tecnico' ? '#f59e0b' : '#34d399' }}
                    />
                    {acceso}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className={`mt-5 w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all ${profile.bgColor} ${profile.color} border ${profile.borderColor} group-hover:shadow-md`}>
                Entrar como {profile.cargo}
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-slate-500 text-xs text-center"
      >
        Este es un prototipo para evaluación de experiencia de usuario. No requiere contraseña.
      </motion.p>
    </div>
  );
}
