/**
 * Script de seed standalone — ejecutar con:
 *   npm run seed          (seed normal — omite si ya hay datos)
 *   npm run seed:reset    (borra todo y vuelve a crear)
 *
 * Usa ts-node directamente, sin levantar el servidor NestJS.
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as admin from 'firebase-admin';

// Cargar .env desde la raíz del backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── Config Firebase ──────────────────────────────────────────────────────────

const projectId   = process.env.FIREBASE_PROJECT_ID   || '';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const databaseURL = process.env.FIREBASE_DATABASE_URL || `https://${projectId}.firebaseio.com`;

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌  Faltan credenciales Firebase en .env');
  console.error('   Asegúrate de que back/.env tenga FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

const app = admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  databaseURL,
});

const auth      = admin.auth(app);
const firestore = admin.firestore(app);

// ─── Datos del seed ───────────────────────────────────────────────────────────

const SEED_USERS = [
  {
    id: 'USR-001',
    nombre: 'Roberto Gómez',
    email: 'rgomez@surmotor.com',
    password: 'Jefe2024#',
    rol: 'jefe',
    sede: 'SURMOTOR',
    area: 'TALLER',
    activo: true,
  },
  {
    id: 'USR-002',
    nombre: 'Carlos Mendoza',
    email: 'cmendoza@surmotor.com',
    password: 'Tecnico2024#',
    rol: 'tecnico',
    sede: 'SURMOTOR',
    area: 'TALLER',
    activo: true,
  },
  {
    id: 'USR-003',
    nombre: 'Juan Castro',
    email: 'jcastro@surmotor.com',
    password: 'Personal2024#',
    rol: 'personal',
    sede: 'SURMOTOR',
    area: 'TALLER',
    activo: true,
  },
  {
    id: 'USR-004',
    nombre: 'Ana Torres',
    email: 'atorres@surmotor.com',
    password: 'Personal2024#',
    rol: 'personal',
    sede: 'SURMOTOR',
    area: 'RECEPCION',
    activo: true,
  },
  {
    id: 'USR-005',
    nombre: 'Pedro Villacís',
    email: 'pvillacis@granda.com',
    password: 'Tecnico2024#',
    rol: 'tecnico',
    sede: 'GRANDA_CENTENO',
    area: 'ENDEREZADO',
    activo: true,
  },
  {
    id: 'USR-006',
    nombre: 'Rodrigo Caicedo',
    email: 'rcaicedo@granda.com',
    password: 'Tecnico2024#',
    rol: 'tecnico',
    sede: 'GRANDA_CENTENO',
    area: 'PINTURA',
    activo: true,
  },
  {
    id: 'USR-007',
    nombre: 'Luis Pérez',
    email: 'lperez@shyris.com',
    password: 'Personal2024#',
    rol: 'personal',
    sede: 'SHYRIS',
    area: 'BODEGA',
    activo: true,
  },
  {
    id: 'USR-008',
    nombre: 'Marco Villacís',
    email: 'mvillacis@shyris.com',
    password: 'Personal2024#',
    rol: 'personal',
    sede: 'SHYRIS',
    area: 'TALLER',
    activo: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function deleteAllUsers() {
  console.log('\n🗑️  Borrando usuarios existentes...');

  // Firestore
  const snap = await firestore.collection('usuarios').get();
  const batch = firestore.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`   Firestore: ${snap.size} documentos eliminados`);

  // Firebase Auth — obtener todos los usuarios y borrarlos
  let pageToken: string | undefined;
  const uidsToDelete: string[] = [];

  do {
    const result = await auth.listUsers(1000, pageToken);
    result.users.forEach(u => uidsToDelete.push(u.uid));
    pageToken = result.pageToken;
  } while (pageToken);

  if (uidsToDelete.length > 0) {
    await auth.deleteUsers(uidsToDelete);
    console.log(`   Firebase Auth: ${uidsToDelete.length} usuarios eliminados`);
  } else {
    console.log('   Firebase Auth: sin usuarios que eliminar');
  }
}

async function createUser(u: typeof SEED_USERS[0]): Promise<string> {
  try {
    const record = await auth.createUser({
      email: u.email,
      password: u.password,
      displayName: u.nombre,
      disabled: !u.activo,
    });
    console.log(`   ✅  Auth creado:    ${u.email}  (${u.rol})`);
    return record.uid;
  } catch (err: any) {
    if (err.code === 'auth/email-already-exists') {
      const existing = await auth.getUserByEmail(u.email);
      console.log(`   ⚠️   Auth ya existe: ${u.email}  uid=${existing.uid}`);
      return existing.uid;
    }
    throw err;
  }
}

async function seed(reset: boolean) {
  console.log('\n🌱  SURMOTOR — Seed de usuarios');
  console.log(`   Modo: ${reset ? 'RESET (borra y recrea todo)' : 'NORMAL (omite si ya hay datos)'}\n`);

  if (reset) {
    await deleteAllUsers();
  } else {
    const existentes = await firestore.collection('usuarios').get();
    if (!existentes.empty) {
      console.log(`ℹ️  Ya existen ${existentes.size} usuarios en Firestore. Usa "npm run seed:reset" para forzar.`);
      await app.delete();
      return;
    }
  }

  console.log('\n👤  Creando usuarios...');
  const now = new Date().toISOString();
  let creados = 0;

  for (const u of SEED_USERS) {
    const uid = await createUser(u);

    await firestore.collection('usuarios').doc(u.id).set({
      uid,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      sede: u.sede,
      area: u.area,
      activo: u.activo,
      createdAt: now,
      updatedAt: now,
    });

    creados++;
  }

  console.log(`\n✅  Seed completado: ${creados} usuarios creados.`);
  console.log('\n📋  Credenciales de acceso:');
  console.log('   rgomez@surmotor.com    / Jefe2024#      (jefe)');
  console.log('   cmendoza@surmotor.com  / Tecnico2024#   (tecnico)');
  console.log('   jcastro@surmotor.com   / Personal2024#  (personal)');

  await app.delete();
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const isReset = process.argv.includes('--reset');
seed(isReset).catch((err) => {
  console.error('\n❌  Error en el seed:', err.message || err);
  process.exit(1);
});
