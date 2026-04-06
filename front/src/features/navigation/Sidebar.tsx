import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  PackageSearch,
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
  LayoutGrid,
  BarChart3,
  UserCheck,
  ChevronDown,
  Boxes,
  ClipboardCheck,
  ShieldHalf,
  Beaker,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';
import { useRole } from '@shared/context/AssetContext';
import { useAuth } from '@shared/context/AuthContext';
import { roleProfiles } from '@shared/types/roles';

/* ───────────────────────────────────────────────────
 * Tipos
 * ─────────────────────────────────────────────────── */

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: readonly string[];
}

interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  roles: readonly string[];
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
}

/* ───────────────────────────────────────────────────
 * Estructura de navegación agrupada por pilar
 * ─────────────────────────────────────────────────── */

const navigation: NavEntry[] = [
  // ── Ítems sueltos (siempre visibles) ──
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['personal', 'tecnico', 'jefe'] },

  // ── Pilar 1: Gestión de Activos ──
  {
    key: 'pilar1',
    label: 'Gestión de Activos',
    icon: Boxes,
    roles: ['personal', 'tecnico', 'jefe'],
    items: [
      { path: '/inventory', label: 'Inventario', icon: PackageSearch, roles: ['personal', 'tecnico', 'jefe'] },
      { path: '/locations', label: 'Catálogo Visual', icon: LayoutGrid, roles: ['personal', 'tecnico', 'jefe'] },
      { path: '/workshop-overview', label: 'Vista Taller', icon: BarChart3, roles: ['tecnico', 'jefe'] },
      { path: '/custody', label: 'Custodia', icon: Users, roles: ['tecnico', 'jefe'] },
      { path: '/responsabilidades', label: 'Responsables', icon: UserCheck, roles: ['jefe'] },
      { path: '/depreciation', label: 'Finanzas / Depreciación', icon: TrendingDown, roles: ['jefe'] },
      { path: '/repair-vs-replace', label: 'Reparar vs. Reemplazar', icon: Hammer, roles: ['tecnico', 'jefe'] },
      { path: '/data-quality', label: 'Calidad de Datos', icon: ShieldAlert, roles: ['jefe'] },
    ],
  },

  // ── Pilar 2: Planificación de Mantenimientos ──
  {
    key: 'pilar2',
    label: 'Mantenimientos',
    icon: ClipboardCheck,
    roles: ['personal', 'tecnico', 'jefe'],
    items: [
      { path: '/maintenance', label: 'Planificación y Semáforo', icon: CalendarClock, roles: ['personal', 'tecnico', 'jefe'] },
    ],
  },

  // ── Pilar 3: Control de Préstamos ──
  {
    key: 'pilar3',
    label: 'Préstamos de Herramientas',
    icon: ShieldHalf,
    roles: ['personal', 'tecnico', 'jefe'],
    items: [
      { path: '/tool-loans', label: 'Solicitudes / Préstamos', icon: ClipboardList, roles: ['personal', 'tecnico', 'jefe'] },
      { path: '/tool-inspections', label: 'Inspecciones Fotográficas', icon: Camera, roles: ['tecnico', 'jefe'] },
      { path: '/tool-devolution', label: 'Devolución / Actas', icon: ShieldCheck, roles: ['tecnico', 'jefe'] },
    ],
  },

  // ── Pilar 4: Insumos y EPP ──
  {
    key: 'pilar4',
    label: 'Insumos y EPP',
    icon: Beaker,
    roles: ['personal', 'tecnico', 'jefe'],
    items: [
      { path: '/material-consumption', label: 'Consumo de Insumos', icon: FlaskConical, roles: ['personal', 'tecnico', 'jefe'] },
      { path: '/ppe-management', label: 'Gestión de EPP', icon: HardHat, roles: ['tecnico', 'jefe'] },
    ],
  },

  // ── Administración (solo jefe) ──
  {
    key: 'admin',
    label: 'Administración',
    icon: Settings,
    roles: ['jefe'],
    items: [
      { path: '/usuarios', label: 'Usuarios', icon: Users, roles: ['jefe'] },
      { path: '/catalogos', label: 'Catálogos', icon: Settings, roles: ['jefe', 'tecnico'] },
    ],
  },
];

/* ───────────────────────────────────────────────────
 * Componente: ítem de navegación individual
 * ─────────────────────────────────────────────────── */

function SidebarLink({ item, collapsed = false }: { item: NavItem; collapsed?: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg transition-all relative group text-sm ${
          isActive ? 'text-white bg-slate-800/50' : 'hover:text-white hover:bg-slate-800/30'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="activeNav"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-amber-500 rounded-r-full"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <Icon size={18} className={isActive ? 'text-amber-500' : ''} />
          {!collapsed && <span className="font-medium">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

/* ───────────────────────────────────────────────────
 * Componente: grupo desplegable (pilar)
 * ─────────────────────────────────────────────────── */

function SidebarGroup({ group, role, collapsed = false }: { group: NavGroup; role: string; collapsed?: boolean }) {
  // Track whether the user has explicitly toggled the group
  const [userToggled, setUserToggled] = useState(false);
  const [open, setOpen] = useState(false);
  const Icon = group.icon;

  // Filtrar ítems por rol
  const visibleItems = group.items.filter((item) =>
    (item.roles as readonly string[]).includes(role),
  );

  if (visibleItems.length === 0) return null;

  // Auto-abrir si algún hijo está activo (solo si el usuario no cerró manualmente)
  const currentPath = window.location.pathname;
  const hasActiveChild = visibleItems.some((item) => currentPath.startsWith(item.path));

  if (hasActiveChild && !open && !userToggled) {
    setTimeout(() => setOpen(true), 0);
  }

  function handleToggle() {
    setUserToggled(true);
    setOpen((prev) => !prev);
  }

  // Collapsed: solo icono del grupo, sin desplegable
  if (collapsed) {
    return (
      <div title={group.label}>
        <button
          onClick={handleToggle}
          className={`w-full flex items-center justify-center px-3 py-2.5 rounded-lg transition-all text-sm ${
            hasActiveChild
              ? 'text-white bg-slate-800/30'
              : 'hover:text-white hover:bg-slate-800/30'
          }`}
        >
          <Icon size={18} className={hasActiveChild ? 'text-amber-400' : ''} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-0.5">
                {visibleItems.map((item) => (
                  <SidebarLink key={item.path} item={item} collapsed />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div>
      {/* Cabecera del grupo */}
      <button
        onClick={handleToggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
          hasActiveChild
            ? 'text-white bg-slate-800/30'
            : 'hover:text-white hover:bg-slate-800/30'
        }`}
      >
        <Icon size={18} className={hasActiveChild ? 'text-amber-400' : ''} />
        <span className="font-semibold flex-1 text-left">{group.label}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className="opacity-50" />
        </motion.div>
      </button>

      {/* Ítems hijos */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-3 pl-3 border-l border-slate-700/50 mt-1 space-y-0.5">
              {visibleItems.map((item) => (
                <SidebarLink key={item.path} item={item} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────────────────────────────────
 * Componente principal: Sidebar
 * ─────────────────────────────────────────────────── */

export function Sidebar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const role = useRole();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const profile = roleProfiles.find((p) => p.role === role);

  if (!profile || !role) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Filtrar entradas de navegación por rol
  const visibleNav = navigation.filter((entry) =>
    (entry.roles as readonly string[]).includes(role),
  );

  return (
    <motion.div
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="bg-slate-900 h-screen flex flex-col text-slate-300 border-r border-slate-800 shrink-0 overflow-hidden"
    >
      {/* Logo + Toggle */}
      <div className={`border-b border-slate-800 ${collapsed ? 'p-3 flex justify-center' : 'p-3 flex items-center gap-3'}`}>
        {collapsed ? (
          <button
            onClick={onToggle}
            className="bg-amber-500 p-2 rounded-lg text-slate-900 hover:bg-amber-400 transition-colors"
            title="Expandir menú"
          >
            <PanelLeftOpen size={22} />
          </button>
        ) : (
          <>
            <div className="bg-amber-500 p-2 rounded-lg text-slate-900 shrink-0">
              <Wrench size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-lg tracking-tight">SURMOTOR</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Gestión de Activos
              </p>
            </div>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-white shrink-0"
              title="Colapsar menú"
            >
              <PanelLeftClose size={18} />
            </button>
          </>
        )}
      </div>

      {/* Role Badge */}
      {!collapsed ? (
        <div
          className={`mx-3 mt-3 px-3 py-2 rounded-lg border ${profile.borderColor} ${profile.bgColor} flex items-center gap-2`}
        >
          <span className={`text-xs font-bold ${profile.color}`}>Vista:</span>
          <span className={`text-xs font-semibold ${profile.color}`}>{profile.cargo}</span>
        </div>
      ) : (
        <div className="mx-2 mt-3 flex justify-center" title={`Vista: ${profile.cargo}`}>
          <div className={`w-2 h-2 rounded-full ${profile.bgColor} border ${profile.borderColor}`} />
        </div>
      )}

      {/* Navegación */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        {visibleNav.map((entry) =>
          isGroup(entry) ? (
            <SidebarGroup key={entry.key} group={entry} role={role} collapsed={collapsed} />
          ) : (
            <SidebarLink key={entry.path} item={entry} collapsed={collapsed} />
          ),
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Cerrar Sesión' : undefined}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg hover:text-red-400 hover:bg-slate-800/30 transition-all text-sm`}
        >
          <LogOut size={18} />
          {!collapsed && <span className="font-medium">Cerrar Sesión</span>}
        </button>
      </div>
    </motion.div>
  );
}
