import { initializeApp, getApps } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Evita reinicializar si ya existe una app (útil en hot-reload con Vite)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firebase Auth — persistencia LOCAL: la sesión sobrevive cierres de pestaña/navegador
export const auth = getAuth(app);

// Setear persistencia LOCAL asegura que el refresh token se guarda en localStorage
// y Firebase renueva automáticamente el ID token (que dura 1h) de forma transparente.
setPersistence(auth, browserLocalPersistence).catch(() => {
  // En entornos sin localStorage (SSR, etc.) simplemente ignora el error
});

// NOTA: El almacenamiento de objetos (imágenes de activos) usa Cloudflare R2.
// Los uploads se envían al backend (POST /api/activos/:id/imagen) que
// gestiona la conexión con R2 directamente. No se usa Firebase Storage en el cliente.

// Firebase Analytics (solo en browser, no en SSR)
export const analyticsPromise = isSupported().then((supported) =>
  supported ? getAnalytics(app) : null
);

export default app;
