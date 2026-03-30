import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  PackageSearch,
  MapPin,
  Users,
  TrendingDown,
  ShieldAlert,
  Wrench,
  CalendarClock,
  Hammer,
  LogOut,
  ClipboardList,
  Camera,
  ShieldCheck,
  FlaskConical,
  HardHat,
} from 'lucide-react';
import { useRole, useAssetContext } from '@shared/context/AssetContext';
import { roleProfiles } from '@shared/types/roles';

const allNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['personal', 'tecnico', 'jefe'] },
  { path: '/inventory', label: 'Inventario', icon: PackageSearch, roles: ['personal', 'tecnico', 'jefe'] },
  { path: '/locations', label: 'Ubicaciones (F1.1)', icon: MapPin, roles: ['tecnico', 'jefe'] },
  { path: '/custody', label: 'Custodia (F2)', icon: Users, roles: ['tecnico', 'jefe'] },
  { path: '/tool-loans', label: 'Préstamos (C8)', icon: ClipboardList, roles: ['personal', 'tecnico', 'jefe'] },
  { path: '/tool-inspections', label: 'Inspecciones (C9)', icon: Camera, roles: ['tecnico', 'jefe'] },
  { path: '/tool-devolution', label: 'Devolución (C10)', icon: ShieldCheck, roles: ['tecnico', 'jefe'] },
  { path: '/material-consumption', label: 'Insumos (C11)', icon: FlaskConical, roles: ['personal', 'tecnico', 'jefe'] },
  { path: '/ppe-management', label: 'Gestión EPP (C12)', icon: HardHat, roles: ['tecnico', 'jefe'] },
  { path: '/depreciation', label: 'Finanzas / Adquisiciones', icon: TrendingDown, roles: ['jefe'] },
  { path: '/maintenance', label: 'Planif. Oportuna (P2)', icon: CalendarClock, roles: ['personal', 'tecnico', 'jefe'] },
  { path: '/repair-vs-replace', label: 'Reparar vs. Reemplazar (F7)', icon: Hammer, roles: ['tecnico', 'jefe'] },
  { path: '/data-quality', label: 'Calidad de Datos', icon: ShieldAlert, roles: ['jefe'] },
] as const;

export function Sidebar() {
  const role = useRole();
  const { dispatch } = useAssetContext();
  const navigate = useNavigate();
  
  const profile = roleProfiles.find((p) => p.role === role)!;
  const navItems = allNavItems.filter((item) => (item.roles as readonly string[]).includes(role!));

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  };

  return (
    <div className="w-64 bg-slate-900 h-screen flex flex-col text-slate-300 border-r border-slate-800 shrink-0">
      {/* Logo Area */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-amber-500 p-2 rounded-lg text-slate-900">
          <Wrench size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-white font-bold text-xl tracking-tight">SURMOTOR</h1>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Gestión de Activos</p>
        </div>
      </div>

      {/* Role Badge */}
      <div className={`mx-3 mt-3 px-3 py-2 rounded-lg border ${profile.borderColor} ${profile.bgColor} flex items-center gap-2`}>
        <span className={`text-xs font-bold ${profile.color}`}>Vista:</span>
        <span className={`text-xs font-semibold ${profile.color}`}>{profile.cargo}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all relative group ${
                  isActive ? 'text-white bg-slate-800/50' : 'hover:text-white hover:bg-slate-800/30'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-500 rounded-r-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon size={20} className={isActive ? 'text-amber-500' : ''} />
                  <span className="font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:text-red-400 hover:bg-slate-800/30 transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}
