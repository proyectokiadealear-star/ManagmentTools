import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from '@features/navigation/Sidebar';
import { LoginScreen } from '@features/auth/LoginScreen';
import { AuthProvider, useAuth } from '@shared/context/AuthContext';
import { AssetProvider } from '@shared/context/AssetContext';
import { Dashboard } from '@features/asset-management/Dashboard';
import { Inventory } from '@features/asset-management/Inventory';
import { AssetCatalog } from '@features/asset-management/AssetCatalog';
import { WorkshopOverview } from '@features/asset-management/WorkshopOverview';
import { Custody } from '@features/asset-management/Custody';
import { Depreciation } from '@features/finance/Depreciation';
import { DataQuality } from '@features/asset-management/DataQuality';
import { MaintenancePlanning } from '@features/maintenance/MaintenancePlanning';
import { RepairVsReplace } from '@features/finance/RepairVsReplace';
import { ToolLoans } from '@features/tool-management/ToolLoans';
import { ToolInspections } from '@features/tool-management/ToolInspections';
import { ToolDevolution } from '@features/tool-management/ToolDevolution';
import { MaterialConsumption } from '@features/consumables-safety/MaterialConsumption';
import { PPEManagement } from '@features/consumables-safety/PPEManagement';
import { ResponsabilidadesView } from '@features/responsabilidades/ResponsabilidadesView';
import { UsuariosView } from '@features/usuarios/UsuariosView';

/** Shows a full-screen spinner while Firebase resolves the auth state */
function AuthLoader() {
  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** Protected route — redirects to /login if not authenticated */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

/** Login route — redirects to /dashboard if already authenticated */
function LoginRoute() {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoader />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <LoginScreen />;
}

/** Main layout with sidebar */
function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
      <main className="flex-1 h-full overflow-y-auto relative">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/locations" element={<AssetCatalog />} />
          <Route path="/catalog" element={<AssetCatalog />} />
          <Route path="/workshop-overview" element={<WorkshopOverview />} />
          <Route path="/custody" element={<Custody />} />
          <Route path="/tool-loans" element={<ToolLoans />} />
          <Route path="/tool-inspections" element={<ToolInspections />} />
          <Route path="/tool-devolution" element={<ToolDevolution />} />
          <Route path="/material-consumption" element={<MaterialConsumption />} />
          <Route path="/ppe-management" element={<PPEManagement />} />
          <Route path="/responsabilidades" element={<ResponsabilidadesView />} />
          <Route path="/usuarios" element={<UsuariosView />} />
          <Route path="/depreciation" element={<Depreciation />} />
          <Route path="/maintenance" element={<MaintenancePlanning />} />
          <Route path="/repair-vs-replace" element={<RepairVsReplace />} />
          <Route path="/data-quality" element={<DataQuality />} />
        </Routes>
      </main>
    </div>
  );
}

/** Root App component */
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AssetProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            } />
          </Routes>
        </AssetProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
