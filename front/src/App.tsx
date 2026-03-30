import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from '@features/navigation/Sidebar';
import { LoginScreen } from '@features/auth/LoginScreen';
import { AssetProvider, useAssetContext } from '@shared/context/AssetContext';
import { Dashboard } from '@features/asset-management/Dashboard';
import { Inventory } from '@features/asset-management/Inventory';
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

/** Protected route wrapper - redirects to login if no role */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state: { role } } = useAssetContext();
  
  if (!role) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

/** Login handler component */
function LoginHandler() {
  const { dispatch } = useAssetContext();
  
  const handleSelectRole = (selectedRole: 'personal' | 'tecnico' | 'jefe') => {
    dispatch({ type: 'SET_ROLE', payload: selectedRole });
  };
  
  return <LoginScreen onSelectRole={handleSelectRole} />;
}

/** Main layout with sidebar */
function MainLayout() {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto relative">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/locations" element={<Inventory />} />
          <Route path="/custody" element={<Custody />} />
          <Route path="/tool-loans" element={<ToolLoans />} />
          <Route path="/tool-inspections" element={<ToolInspections />} />
          <Route path="/tool-devolution" element={<ToolDevolution />} />
          <Route path="/material-consumption" element={<MaterialConsumption />} />
          <Route path="/ppe-management" element={<PPEManagement />} />
          <Route path="/depreciation" element={<Depreciation />} />
          <Route path="/maintenance" element={<MaintenancePlanning />} />
          <Route path="/repair-vs-replace" element={<RepairVsReplace />} />
          <Route path="/data-quality" element={<DataQuality />} />
        </Routes>
      </main>
    </div>
  );
}

/** Root App component with Router + Provider */
export function App() {
  return (
    <BrowserRouter>
      <AssetProvider>
        <Routes>
          <Route path="/login" element={<LoginHandler />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </AssetProvider>
    </BrowserRouter>
  );
}
