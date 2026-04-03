export default () => ({
  port: parseInt(process.env.PORT || '3000', 10) || 3000,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    databaseURL: process.env.FIREBASE_DATABASE_URL || '',
  },
});
