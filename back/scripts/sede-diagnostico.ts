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

async function main() {
  console.log('\n🔎 Diagnóstico de activos legacy sin sede / sede inconsistente\n');

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

  let total = 0;
  let sinArea = 0;
  let areaNoExiste = 0;
  let areaSinSede = 0;
  let sinSede = 0;
  let inconsistente = 0;
  const ejemplos: Array<{ id: string; areaId?: string; sede?: string; sedeDerivada?: string; problema: string }> = [];

  for (const doc of activosSnap.docs) {
    total++;
    const data = doc.data() as { areaId?: string; sede?: string };
    const areaId = data.areaId;
    const sedeActual = normalizeSede(data.sede);

    if (!areaId) {
      sinArea++;
      if (ejemplos.length < 20) ejemplos.push({ id: doc.id, problema: 'sin-area' });
      continue;
    }

    if (!areaSedeMap.has(areaId)) {
      const areaExiste = areasSnap.docs.some(a => a.id === areaId);
      if (!areaExiste) {
        areaNoExiste++;
        if (ejemplos.length < 20) ejemplos.push({ id: doc.id, areaId, sede: sedeActual, problema: 'area-no-existe' });
      } else {
        areaSinSede++;
        if (ejemplos.length < 20) ejemplos.push({ id: doc.id, areaId, sede: sedeActual, problema: 'area-sin-sede' });
      }
      continue;
    }

    const sedeDerivada = areaSedeMap.get(areaId)!;
    if (!sedeActual) {
      sinSede++;
      if (ejemplos.length < 20) ejemplos.push({ id: doc.id, areaId, sedeDerivada, problema: 'sin-sede' });
      continue;
    }

    if (sedeActual !== sedeDerivada) {
      inconsistente++;
      if (ejemplos.length < 20) ejemplos.push({ id: doc.id, areaId, sede: sedeActual, sedeDerivada, problema: 'sede-inconsistente' });
    }
  }

  console.log('Resumen:');
  console.log(`- Total activos: ${total}`);
  console.log(`- Sin areaId: ${sinArea}`);
  console.log(`- areaId inexistente: ${areaNoExiste}`);
  console.log(`- areaId con sede no disponible: ${areaSinSede}`);
  console.log(`- Sin sede (legacy): ${sinSede}`);
  console.log(`- Sede inconsistente vs área: ${inconsistente}`);
  console.log(`- Requieren normalización: ${sinSede + inconsistente}`);

  if (ejemplos.length > 0) {
    console.log('\nEjemplos (máx 20):');
    for (const item of ejemplos) {
      console.log(
        `- ${item.id} | problema=${item.problema} | areaId=${item.areaId ?? '-'} | sede=${item.sede ?? '-'} | sedeDerivada=${item.sedeDerivada ?? '-'}`,
      );
    }
  }

  await app.delete();
}

main().catch(async (err) => {
  console.error('\n❌ Error en diagnóstico:', err?.message || err);
  await app.delete();
  process.exit(1);
});
