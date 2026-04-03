// Las variables se leen en tiempo de ejecución (lazy) para que
// ConfigModule haya procesado el .env antes de este acceso.
export const getFirebaseConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID || '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL || `https://${projectId}.firebaseio.com`;

  return { projectId, clientEmail, privateKey, databaseURL };
};
