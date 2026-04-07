import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { Area } from '../assets/entities/area.entity';
import { Bahia } from '../assets/entities/bahia.entity';
import { Rack } from '../assets/entities/rack.entity';
import { Caja } from '../assets/entities/caja.entity';
import { AreaTaller, AREA_LABELS } from '../common/enums/area-taller.enum';
import { Sede } from '../common/enums/sede.enum';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  async findAllAreas(): Promise<Area[]> {
    const snapshot = await this.firestore.collection('areas').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Area));
  }

  async findAreaById(id: string): Promise<Area> {
    const doc = await this.firestore.collection('areas').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Área ${id} no encontrada`);
    return { id: doc.id, ...doc.data() } as Area;
  }

  async createArea(data: Omit<Area, 'id'>): Promise<Area> {
    const now = new Date().toISOString();
    const docRef = await this.firestore.collection('areas').add({ ...data, createdAt: now, updatedAt: now });
    return { id: docRef.id, ...data, createdAt: now, updatedAt: now };
  }

  async updateArea(id: string, data: Partial<Area>): Promise<Area> {
    const docRef = this.firestore.collection('areas').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException(`Área ${id} no encontrada`);
    const updates = { ...data, updatedAt: new Date().toISOString() };
    await docRef.update(updates);
    return { id: doc.id, ...doc.data(), ...updates } as Area;
  }

  async removeArea(id: string): Promise<void> {
    const docRef = this.firestore.collection('areas').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException(`Área ${id} no encontrada`);
    await docRef.delete();
  }

  async findBahiasByArea(areaId: string): Promise<Bahia[]> {
    const snapshot = await this.firestore
      .collection('bahias')
      .where('areaId', '==', areaId)
      .get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bahia));
    return items.sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
  }

  async createBahia(data: Omit<Bahia, 'id'>): Promise<Bahia> {
    const now = new Date().toISOString();
    const docRef = await this.firestore.collection('bahias').add({ ...data, createdAt: now, updatedAt: now });
    return { id: docRef.id, ...data, createdAt: now, updatedAt: now };
  }

  async updateBahia(id: string, data: Partial<Bahia>): Promise<Bahia> {
    const docRef = this.firestore.collection('bahias').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException(`Bahía ${id} no encontrada`);
    const updates = { ...data, updatedAt: new Date().toISOString() };
    await docRef.update(updates);
    return { id: doc.id, ...doc.data(), ...updates } as Bahia;
  }

  async removeBahia(id: string): Promise<void> {
    const docRef = this.firestore.collection('bahias').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException(`Bahía ${id} no encontrada`);
    await docRef.delete();
  }

  async findRacksByBahia(bahiaId: string): Promise<Rack[]> {
    const snapshot = await this.firestore
      .collection('racks')
      .where('bahiaId', '==', bahiaId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rack));
  }

  async createRack(data: Omit<Rack, 'id'>): Promise<Rack> {
    const now = new Date().toISOString();
    const docRef = await this.firestore.collection('racks').add({ ...data, createdAt: now, updatedAt: now });
    return { id: docRef.id, ...data, createdAt: now, updatedAt: now };
  }

  async updateRack(id: string, data: Partial<Rack>): Promise<Rack> {
    const docRef = this.firestore.collection('racks').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException(`Rack ${id} no encontrado`);
    const updates = { ...data, updatedAt: new Date().toISOString() };
    await docRef.update(updates);
    return { id: doc.id, ...doc.data(), ...updates } as Rack;
  }

  async removeRack(id: string): Promise<void> {
    const docRef = this.firestore.collection('racks').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException(`Rack ${id} no encontrado`);
    await docRef.delete();
  }

  async findCajasByRack(rackId: string): Promise<Caja[]> {
    const snapshot = await this.firestore
      .collection('cajas')
      .where('rackId', '==', rackId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Caja));
  }

  async findLocationTree(): Promise<{ areas: Area[]; bahias: Bahia[]; racks: Rack[] }> {
    const [areasSnap, bahiasSnap, racksSnap] = await Promise.all([
      this.firestore.collection('areas').get(),
      this.firestore.collection('bahias').get(),
      this.firestore.collection('racks').get(),
    ]);
    return {
      areas: areasSnap.docs.map(d => ({ id: d.id, ...d.data() } as Area)),
      bahias: bahiasSnap.docs.map(d => ({ id: d.id, ...d.data() } as Bahia)),
      racks: racksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Rack)),
    };
  }

  async createCaja(data: Omit<Caja, 'id'>): Promise<Caja> {
    const now = new Date().toISOString();
    const docRef = await this.firestore.collection('cajas').add({ ...data, createdAt: now, updatedAt: now });
    return { id: docRef.id, ...data, createdAt: now, updatedAt: now };
  }

  async updateCaja(id: string, data: Partial<Caja>): Promise<Caja> {
    const docRef = this.firestore.collection('cajas').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException(`Caja ${id} no encontrada`);
    const updates = { ...data, updatedAt: new Date().toISOString() };
    await docRef.update(updates);
    return { id: doc.id, ...doc.data(), ...updates } as Caja;
  }

  async removeCaja(id: string): Promise<void> {
    const docRef = this.firestore.collection('cajas').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException(`Caja ${id} no encontrada`);
    await docRef.delete();
  }

  async seedInitialData(): Promise<void> {
    const areasSnapshot = await this.firestore.collection('areas').limit(1).get();
    if (!areasSnapshot.empty) {
      this.logger.log('Seed ubicaciones omitido: ya existen áreas.');
      return;
    }

    const now = new Date().toISOString();

    /**
     * Cada sede tiene sus 5 áreas.
     * tipo  = AreaTaller enum (fuente de verdad para lógica)
     * sede  = Sede enum
     */
    const sedesYAreas: Array<{ sede: Sede; areas: Array<{ tipo: AreaTaller; descripcion: string; capacidad: number }> }> = [
      {
        sede: Sede.SURMOTOR,
        areas: [
          { tipo: AreaTaller.TALLER,     descripcion: 'Taller mecánica general',        capacidad: 20 },
          { tipo: AreaTaller.ENDEREZADO, descripcion: 'Área de enderezado de carrocería', capacidad: 10 },
          { tipo: AreaTaller.PINTURA,    descripcion: 'Cabina de pintura',               capacidad:  8 },
          { tipo: AreaTaller.RECEPCION,  descripcion: 'Recepción y atención al cliente', capacidad: 10 },
          { tipo: AreaTaller.BODEGA,     descripcion: 'Bodega de repuestos',             capacidad: 50 },
        ],
      },
      {
        sede: Sede.GRANDA_CENTENO,
        areas: [
          { tipo: AreaTaller.TALLER,     descripcion: 'Taller mecánica general',        capacidad: 15 },
          { tipo: AreaTaller.ENDEREZADO, descripcion: 'Área de enderezado de carrocería', capacidad:  8 },
          { tipo: AreaTaller.PINTURA,    descripcion: 'Cabina de pintura',               capacidad:  6 },
          { tipo: AreaTaller.RECEPCION,  descripcion: 'Recepción y atención al cliente', capacidad:  8 },
          { tipo: AreaTaller.BODEGA,     descripcion: 'Bodega de repuestos',             capacidad: 30 },
        ],
      },
      {
        sede: Sede.SHYRIS,
        areas: [
          { tipo: AreaTaller.TALLER,     descripcion: 'Taller mecánica general',        capacidad: 12 },
          { tipo: AreaTaller.ENDEREZADO, descripcion: 'Área de enderezado de carrocería', capacidad:  6 },
          { tipo: AreaTaller.PINTURA,    descripcion: 'Cabina de pintura',               capacidad:  4 },
          { tipo: AreaTaller.RECEPCION,  descripcion: 'Recepción y atención al cliente', capacidad:  6 },
          { tipo: AreaTaller.BODEGA,     descripcion: 'Bodega de repuestos',             capacidad: 20 },
        ],
      },
    ];

    for (const { sede, areas } of sedesYAreas) {
      for (const areaData of areas) {
        const area: Omit<Area, 'id'> = {
          tipo:        areaData.tipo,
          nombre:      AREA_LABELS[areaData.tipo],
          descripcion: areaData.descripcion,
          capacidad:   areaData.capacidad,
          estado:      'activa',
          sede,
          createdAt:   now,
          updatedAt:   now,
        };

        const areaRef = await this.firestore.collection('areas').add(area);

        for (let i = 1; i <= 3; i++) {
          const bahiaRef = await this.firestore.collection('bahias').add({
            areaId:    areaRef.id,
            nombre:    `Bahía-${i}`,
            numero:    i,
            capacidad: 5,
            estado:    'activa',
            createdAt: now,
            updatedAt: now,
          });

          for (let r = 1; r <= 2; r++) {
            const rackRef = await this.firestore.collection('racks').add({
              areaId:    areaRef.id,
              bahiaId:   bahiaRef.id,
              nombre:    `Rack-${String.fromCharCode(64 + r)}`,
              capacidad: 10,
              estado:    'activo',
              createdAt: now,
              updatedAt: now,
            });

            for (let c = 1; c <= 3; c++) {
              await this.firestore.collection('cajas').add({
                rackId:    rackRef.id,
                areaId:    areaRef.id,
                bahiaId:   bahiaRef.id,
                numero:    `Caja-${String(c).padStart(3, '0')}`,
                capacidad: 20,
                estado:    'disponible',
                createdAt: now,
                updatedAt: now,
              });
            }
          }
        }
      }
    }

    this.logger.log('Seed ubicaciones completado: áreas (con sede y tipo), bahías, racks y cajas insertados.');
  }
}
