import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
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
export class LocationsService implements OnModuleInit {
  private readonly logger = new Logger(LocationsService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  async onModuleInit() {
    await this.seedInitialData();
  }

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

  async findBahiasByArea(areaId: string): Promise<Bahia[]> {
    const snapshot = await this.firestore
      .collection('bahias')
      .where('areaId', '==', areaId)
      .orderBy('numero')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bahia));
  }

  async findRacksByBahia(bahiaId: string): Promise<Rack[]> {
    const snapshot = await this.firestore
      .collection('racks')
      .where('bahiaId', '==', bahiaId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rack));
  }

  async findCajasByRack(rackId: string): Promise<Caja[]> {
    const snapshot = await this.firestore
      .collection('cajas')
      .where('rackId', '==', rackId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Caja));
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
