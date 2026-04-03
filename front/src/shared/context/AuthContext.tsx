import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import { UserRole } from '../types/roles';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl || 'http://localhost:3000';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  uid: string;
  email: string;
  nombre: string;
  rol: UserRole;
  sede: string;
  area: string;
  fotoUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helper — obtiene perfil desde el backend con el ID token ─────────────────

async function fetchProfile(firebaseUser: FirebaseUser): Promise<AuthUser> {
  // getIdToken(false) usa el token cacheado y lo renueva automáticamente si está por vencer
  const idToken = await firebaseUser.getIdToken(false);

  const res = await fetch(`${API_URL}/api/auth/me`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Error ${res.status} al obtener perfil`);
  }

  return res.json();
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ user: null, loading: false, error: null });
        return;
      }

      try {
        const profile = await fetchProfile(firebaseUser);
        setState({ user: profile, loading: false, error: null });
      } catch (err: any) {
        // Si el backend rechaza (usuario desactivado, no registrado, etc.)
        await signOut(auth);
        setState({
          user: null,
          loading: false,
          error: err.message || 'No se pudo obtener el perfil del usuario',
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged se dispara automáticamente → fetchProfile → setState
    } catch (err: any) {
      const msg = mapFirebaseError(err.code);
      setState({ user: null, loading: false, error: msg });
      throw new Error(msg);
    }
  };

  const logout = async () => {
    setState((prev) => ({ ...prev, loading: true }));
    await signOut(auth);
    // onAuthStateChanged dispara user=null → setState loading:false
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

// ─── Mapeo de errores Firebase → mensajes legibles ───────────────────────────

function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email o contraseña incorrectos';
    case 'auth/user-disabled':
      return 'Tu cuenta está desactivada. Contacta al administrador.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Espera unos minutos e intenta nuevamente.';
    case 'auth/network-request-failed':
      return 'Sin conexión a internet. Verifica tu red.';
    default:
      return 'Error al iniciar sesión. Intenta nuevamente.';
  }
}
