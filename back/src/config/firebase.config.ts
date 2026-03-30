import { FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL } from './configuration';

export const firebaseConfig = {
  projectId: FIREBASE_PROJECT_ID,
  privateKey: FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: FIREBASE_CLIENT_EMAIL,
  databaseURL: `https://${FIREBASE_PROJECT_ID}.firebaseio.com`,
};
