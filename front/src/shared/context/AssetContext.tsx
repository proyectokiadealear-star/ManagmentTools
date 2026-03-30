/**
 * AssetContext — Global state for assets and user role.
 *
 * Eliminates prop drilling by providing:
 *   - assets: Asset[] — read-only access to asset data
 *   - role: UserRole | null — current user role
 *   - dispatch: React.Dispatch<AppAction> — for mutations
 *
 * Usage in components:
 *   const { assets, role, dispatch } = useAssetContext();
 *
 * Usage for mutations:
 *   dispatch({ type: 'ADD_ASSET', payload: newAsset });
 *   dispatch({ type: 'UPDATE_ASSET', payload: updatedAsset });
 *   dispatch({ type: 'DELETE_ASSET', payload: id });
 *   dispatch({ type: 'SET_ROLE', payload: 'jefe' });
 *   dispatch({ type: 'LOGOUT' });
 */
import { createContext, useContext, useReducer, ReactNode } from 'react';
import { Asset } from '../../data/mockData';
import { UserRole } from '@shared/types/roles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppState {
  assets: Asset[];
  role: UserRole | null;
}

export type AppAction =
  | { type: 'ADD_ASSET'; payload: Asset }
  | { type: 'UPDATE_ASSET'; payload: Asset }
  | { type: 'DELETE_ASSET'; payload: string }
  | { type: 'SET_ROLE'; payload: UserRole }
  | { type: 'LOGOUT' };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_ASSET':
      return {
        ...state,
        assets: [action.payload, ...state.assets],
      };
    case 'UPDATE_ASSET':
      return {
        ...state,
        assets: state.assets.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case 'DELETE_ASSET':
      return {
        ...state,
        assets: state.assets.filter((a) => a.id !== action.payload),
      };
    case 'SET_ROLE':
      return {
        ...state,
        role: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        role: null,
      };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

// Lazy initialization to avoid circular dependency issues
function getInitialAssets(): Asset[] {
  try {
    // Dynamic import to avoid issues with mockData not being loaded yet
    const { mockAssets } = require('../../data/mockData');
    return mockAssets;
  } catch {
    return [];
  }
}

const initialState: AppState = {
  assets: [], // Will be populated by useState initializer in provider
  role: null,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AssetContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AssetContext = createContext<AssetContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AssetProviderProps {
  children: ReactNode;
}

export function AssetProvider({ children }: AssetProviderProps) {
  const [state, dispatch] = useReducer(appReducer, undefined, () => ({
    ...initialState,
    assets: getInitialAssets(),
  }));

  return (
    <AssetContext.Provider value={{ state, dispatch }}>
      {children}
    </AssetContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAssetContext(): AssetContextValue {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error('useAssetContext must be used within an AssetProvider');
  }
  return context;
}

/** Convenience hooks for specific slices */
export function useAssets(): Asset[] {
  return useAssetContext().state.assets;
}

export function useRole(): UserRole | null {
  return useAssetContext().state.role;
}
