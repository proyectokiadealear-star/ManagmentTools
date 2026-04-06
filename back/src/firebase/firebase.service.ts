import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getFirebaseConfig } from '../config/firebase.config';

// ─── In-memory mock store for demo mode ────────────────────────────────────────
type DocData = Record<string, any>;

class MockDocumentSnapshot {
  exists: boolean;
  id: string;
  private _data: DocData | undefined;

  constructor(id: string, data?: DocData) {
    this.id = id;
    this._data = data;
    this.exists = data !== undefined;
  }

  data(): DocData | undefined {
    return this._data;
  }
}

class MockQuerySnapshot {
  docs: MockDocumentSnapshot[];
  empty: boolean;

  constructor(docs: MockDocumentSnapshot[]) {
    this.docs = docs;
    this.empty = docs.length === 0;
  }
}

class MockDocumentReference {
  id: string;
  private store: Map<string, DocData>;
  private collectionName: string;

  constructor(collectionName: string, id: string, store: Map<string, DocData>) {
    this.id = id;
    this.store = store;
    this.collectionName = collectionName;
  }

  async get(): Promise<MockDocumentSnapshot> {
    const data = this.store.get(this.id);
    return new MockDocumentSnapshot(this.id, data);
  }

  async set(data: DocData): Promise<void> {
    this.store.set(this.id, { ...data });
  }

  async update(data: DocData): Promise<void> {
    const existing = this.store.get(this.id) || {};
    this.store.set(this.id, { ...existing, ...data });
  }

  async delete(): Promise<void> {
    this.store.delete(this.id);
  }
}

class MockCollectionQuery {
  protected store: Map<string, DocData>;
  protected collectionName: string;
  protected filters: Array<{ field: string; op: string; value: any }> = [];
  protected _orderBy: string | null = null;
  protected _limit: number | null = null;

  constructor(collectionName: string, store: Map<string, DocData>) {
    this.collectionName = collectionName;
    this.store = store;
  }

  where(field: string, op: string, value: any): MockCollectionQuery {
    const q = new MockCollectionQuery(this.collectionName, this.store);
    q.filters = [...this.filters, { field, op, value }];
    q._orderBy = this._orderBy;
    q._limit = this._limit;
    return q;
  }

  orderBy(field: string): MockCollectionQuery {
    const q = new MockCollectionQuery(this.collectionName, this.store);
    q.filters = [...this.filters];
    q._orderBy = field;
    q._limit = this._limit;
    return q;
  }

  limit(n: number): MockCollectionQuery {
    const q = new MockCollectionQuery(this.collectionName, this.store);
    q.filters = [...this.filters];
    q._orderBy = this._orderBy;
    q._limit = n;
    return q;
  }

  async get(): Promise<MockQuerySnapshot> {
    let entries = Array.from(this.store.entries());

    for (const { field, op, value } of this.filters) {
      entries = entries.filter(([, data]) => {
        if (op === '==') return data[field] === value;
        if (op === '!=') return data[field] !== value;
        if (op === '>') return data[field] > value;
        if (op === '<') return data[field] < value;
        return true;
      });
    }

    if (this._orderBy) {
      const key = this._orderBy;
      entries.sort(([, a], [, b]) => (a[key] > b[key] ? 1 : -1));
    }

    if (this._limit !== null) {
      entries = entries.slice(0, this._limit);
    }

    const docs = entries.map(([id, data]) => new MockDocumentSnapshot(id, data));
    return new MockQuerySnapshot(docs);
  }
}

class MockCollectionReference extends MockCollectionQuery {
  constructor(collectionName: string, store: Map<string, DocData>) {
    super(collectionName, store);
  }

  doc(id: string): MockDocumentReference {
    return new MockDocumentReference(this.collectionName, id, this.store);
  }

  async add(data: DocData): Promise<MockDocumentReference> {
    const id = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.store.set(id, { ...data });
    return new MockDocumentReference(this.collectionName, id, this.store);
  }
}

class MockFirestore {
  private collections: Map<string, Map<string, DocData>> = new Map();

  collection(name: string): MockCollectionReference {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return new MockCollectionReference(name, this.collections.get(name)!);
  }
}

class MockAuth {
  private users: Map<string, { uid: string; email: string; displayName?: string; disabled?: boolean }> = new Map();

  async verifyIdToken(_token: string): Promise<any> {
    return { uid: 'demo-user', email: 'demo@demo.com' };
  }

  async createUser(props: { email: string; password: string; displayName?: string; disabled?: boolean }): Promise<{ uid: string }> {
    const uid = `mock_uid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.users.set(uid, { uid, email: props.email, displayName: props.displayName, disabled: props.disabled });
    return { uid };
  }

  async getUserByEmail(email: string): Promise<{ uid: string }> {
    for (const user of this.users.values()) {
      if (user.email === email) return { uid: user.uid };
    }
    const err: any = new Error(`No user found for email ${email}`);
    err.code = 'auth/user-not-found';
    throw err;
  }

  async updateUser(uid: string, props: Record<string, any>): Promise<{ uid: string }> {
    const user = this.users.get(uid);
    if (user) Object.assign(user, props);
    return { uid };
  }

  async deleteUser(uid: string): Promise<void> {
    this.users.delete(uid);
  }
}

class MockStorage {
  bucket(_name?: string) {
    return {
      file: (_path: string) => ({
        save: async (_buffer: Buffer, _opts: any) => {},
        makePublic: async () => {},
        getSignedUrl: async (_opts: any) => ['https://via.placeholder.com/400x300?text=No+Image'],
        publicUrl: () => 'https://via.placeholder.com/400x300?text=No+Image',
      }),
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class FirebaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: admin.app.App | null = null;
  private mockFirestore: MockFirestore | null = null;
  private mockAuth: MockAuth | null = null;
  private mockStorage: MockStorage | null = null;
  private isDemoMode = false;

  constructor() {
    const { projectId, clientEmail, privateKey, databaseURL } = getFirebaseConfig();
    const hasCredentials = !!projectId && !!clientEmail && !!privateKey;

    if (hasCredentials) {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL,
      });
      this.logger.log('Firebase inicializado con credenciales reales.');
    } else {
      this.isDemoMode = true;
      this.mockFirestore = new MockFirestore();
      this.mockAuth = new MockAuth();
      this.mockStorage = new MockStorage();
      this.logger.warn(
        '⚠️  MODO DEMO: Firebase no configurado. Se usará un store en memoria. Los datos NO persisten entre reinicios.',
      );
    }
  }

  async onModuleInit() {
    // Firebase initialized
  }

  async onModuleDestroy() {
    if (this.firebaseApp) {
      await this.firebaseApp.delete();
    }
  }

  getFirestore(): any {
    if (this.isDemoMode) return this.mockFirestore!;
    return this.firebaseApp!.firestore();
  }

  getAuth(): any {
    if (this.isDemoMode) return this.mockAuth!;
    return this.firebaseApp!.auth();
  }

  getStorage(): any {
    if (this.isDemoMode) return this.mockStorage!;
    return this.firebaseApp!.storage();
  }
}
