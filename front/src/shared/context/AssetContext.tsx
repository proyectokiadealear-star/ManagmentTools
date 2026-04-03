import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { Asset } from '../../data/mockData';
import { UserRole } from '@shared/types/roles';
import {
  getAssets,
  createAsset as apiCreateAsset,
  updateAsset as apiUpdateAsset,
  deleteAsset as apiDeleteAsset,
} from '../../services/assetService';
import { useAuth } from './AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppState {
  assets: Asset[];
  assetsLoaded: boolean;
}

export type AppAction =
  | { type: 'ADD_ASSET'; payload: Asset }
  | { type: 'UPDATE_ASSET'; payload: Asset }
  | { type: 'DELETE_ASSET'; payload: string }
  | { type: 'SET_ASSETS'; payload: Asset[] };

// ---------------------------------------------------------------------------
// Reducer  (pure — only local state mutations)
// ---------------------------------------------------------------------------

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_ASSET':
      return { ...state, assets: [action.payload, ...state.assets] };
    case 'UPDATE_ASSET':
      return {
        ...state,
        assets: state.assets.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case 'DELETE_ASSET':
      return { ...state, assets: state.assets.filter((a) => a.id !== action.payload) };
    case 'SET_ASSETS':
      return { ...state, assets: action.payload, assetsLoaded: true };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState: AppState = {
  assets: [],
  assetsLoaded: false,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AssetContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  /** Persists a new asset to the backend, then adds it to local state. */
  addAsset: (data: Omit<Asset, 'id'>) => Promise<Asset>;
  /** Persists an edit to the backend, then updates local state. */
  editAsset: (id: string, data: Partial<Asset>) => Promise<Asset>;
  /** Deletes the asset from the backend, then removes it from local state. */
  removeAsset: (id: string) => Promise<void>;
}

const AssetContext = createContext<AssetContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AssetProviderProps {
  children: ReactNode;
}

export function AssetProvider({ children }: AssetProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load assets from backend on mount
  useEffect(() => {
    getAssets().then((assets) => {
      dispatch({ type: 'SET_ASSETS', payload: assets as Asset[] });
    });
  }, []);

  // ── API-backed mutations ──────────────────────────────────────────────────

  const addAsset = useCallback(async (data: Omit<Asset, 'id'>): Promise<Asset> => {
    const created = await apiCreateAsset(data);
    dispatch({ type: 'ADD_ASSET', payload: created });
    return created;
  }, []);

  const editAsset = useCallback(async (id: string, data: Partial<Asset>): Promise<Asset> => {
    const updated = await apiUpdateAsset(id, data);
    dispatch({ type: 'UPDATE_ASSET', payload: updated });
    return updated;
  }, []);

  const removeAsset = useCallback(async (id: string): Promise<void> => {
    await apiDeleteAsset(id);
    dispatch({ type: 'DELETE_ASSET', payload: id });
  }, []);

  return (
    <AssetContext.Provider value={{ state, dispatch, addAsset, editAsset, removeAsset }}>
      {children}
    </AssetContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
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

/** Returns the current user's role from AuthContext */
export function useRole(): UserRole | null {
  const { user } = useAuth();
  return user?.rol ?? null;
}
