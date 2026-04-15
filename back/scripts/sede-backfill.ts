import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as admin from 'firebase-admin';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const projectId = process.env.FIREBASE_PROJECT_ID || '';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const databaseURL = process.env.FIREBASE_DATABASE_URL || `https://${projectId}.firebaseio.com`;

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Faltan credenciales Firebase en back/.env');
  process.exit(1);
}

const app = admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  databaseURL,
});

const firestore = admin.firestore(app);

function normalizeSede(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase();
}

type Mode = 'dry-run' | 'apply';

function getMode(): Mode {
  const raw = (process.env.MODE || process.argv[2] || 'dry-run').toLowerCase();
  return raw === 'apply' ? 'apply' : 'dry-run';
}

async function main() {
  const mode = getMode();
  console.log(`\n🛠️ Backfill de sedes en activos (modo: ${mode})\n`);

  const [areasSnap, activosSnap] = await Promise.all([
    firestore.collection('areas').get(),
    firestore.collection('activos').get(),
  ]);

  const areaSedeMap = new Map<string, string>();
  for (const doc of areasSnap.docs) {
    const data = doc.data() as { sede?: string };
    const sede = normalizeSede(data.sede);
    if (sede) areaSedeMap.set(doc.id, sede);
  }

  let evaluados = 0;
  let candidatos = 0;
  let actualizados = 0;
  let omitidos = 0;
  let errores = 0;

  const batchSize = 400;
  let batch = firestore.batch();
  let ops = 0;

  for (const doc of activosSnap.docs) {
    evaluados++;
    const data = doc.data() as { areaId?: string; sede?: string; updatedAt?: string };
    const areaId = data.areaId;
    const sedeActual = normalizeSede(data.sede);

    if (!areaId) {
      omitidos++;
      continue;
    }

    const sedeDerivada = areaSedeMap.get(areaId);
    if (!sedeDerivada) {
      omitidos++;
      continue;
    }

    if (sedeActual === sedeDerivada) {
      omitidos++;
      continue;
    }

    candidatos++;

    if (mode === 'apply') {
      try {
        const ref = firestore.collection('activos').doc(doc.id);
        batch.update(ref, {
          sede: sedeDerivada,
          updatedAt: new Date().toISOString(),
        });
        ops++;

        if (ops >= batchSize) {
          await batch.commit();
          actualizados += ops;
          batch = firestore.batch();
          ops = 0;
        }
      } catch {
        errores++;
      }
    }
  }

  if (mode === 'apply' && ops > 0) {
    await batch.commit();
    actualizados += ops;
  }

  console.log('Resultado:');
  console.log(`- Evaluados: ${evaluados}`);
  console.log(`- Candidatos a normalizar: ${candidatos}`);
  console.log(`- Actualizados: ${mode === 'apply' ? actualizados : 0}`);
  console.log(`- Omitidos: ${omitidos}`);
  console.log(`- Errores: ${errores}`);

  if (mode === 'dry-run') {
    console.log('\nℹ️ Modo dry-run: no se escribieron cambios.');
    console.log('   Para aplicar, ejecutar: npm run sede:backfill -- apply');
  }

  await app.delete();
}

main().catch(async (err) => {
  console.error('\n❌ Error en backfill:', err?.message || err);
  await app.delete();
  process.exit(1);
});
