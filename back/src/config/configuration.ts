export default () => ({
  port: parseInt(process.env.PORT || '3000', 10) || 3000,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'surmotor-demo',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'demo@surmotor-demo.iam.gserviceaccount.com',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://surmotor-demo.firebaseio.com',
  },
});

export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';
export const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || '';
export const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || '';
