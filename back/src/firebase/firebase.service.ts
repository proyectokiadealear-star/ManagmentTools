import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { firebaseConfig } from '../config/firebase.config';

@Injectable()
export class FirebaseService implements OnModuleInit, OnModuleDestroy {
  private firebaseApp: admin.app.App;

  constructor() {
    this.firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseConfig.projectId,
        clientEmail: firebaseConfig.clientEmail,
        privateKey: firebaseConfig.privateKey,
      }),
      databaseURL: firebaseConfig.databaseURL,
    });
  }

  async onModuleInit() {
    // Firebase initialized
  }

  async onModuleDestroy() {
    await this.firebaseApp.delete();
  }

  getFirestore(): admin.firestore.Firestore {
    return this.firebaseApp.firestore();
  }

  getAuth(): admin.auth.Auth {
    return this.firebaseApp.auth();
  }
}
