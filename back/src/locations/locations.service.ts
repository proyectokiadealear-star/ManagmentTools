import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { Area } from '../assets/entities/area.entity';
import { Bahia } from '../assets/entities/bahia.entity';
import { Rack } from '../assets/entities/rack.entity';
import { Caja } from '../assets/entities/caja.entity';

@Injectable()
export class LocationsService {
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
    if (!areasSnapshot.empty) return;

    const now = new Date().toISOString();

    const areas = [
      { nombre: 'Mecánica', descripcion: 'Área de mecánica general', capacidad: 20, estado: 'activa' },
      { nombre: 'Enderezado', descripcion: 'Área de enderezado y pinturación', capacidad: 10, estado: 'activa' },
      { nombre: 'Pintura', descripcion: 'Cabina de pintura', capacidad: 8, estado: 'activa' },
      { nombre: 'Lavado', descripcion: 'Área de lavado', capacidad: 5, estado: 'activa' },
      { nombre: 'Repuestos', descripcion: 'Bodega de repuestos', capacidad: 50, estado: 'activa' },
    ];

    for (const area of areas) {
      const areaRef = await this.firestore.collection('areas').add({ ...area, createdAt: now, updatedAt: now });
      
      for (let i = 1; i <= 3; i++) {
        const bahiaRef = await this.firestore.collection('bahias').add({
          areaId: areaRef.id,
          nombre: `Bahía-${i}`,
          numero: i,
          capacidad: 5,
          estado: 'activa',
          createdAt: now,
          updatedAt: now,
        });

        for (let r = 1; r <= 2; r++) {
          const rackRef = await this.firestore.collection('racks').add({
            areaId: areaRef.id,
            bahiaId: bahiaRef.id,
            nombre: `Rack-${String.fromCharCode(64 + r)}`,
            capacidad: 10,
            estado: 'activo',
            createdAt: now,
            updatedAt: now,
          });

          for (let c = 1; c <= 3; c++) {
            await this.firestore.collection('cajas').add({
              rackId: rackRef.id,
              areaId: areaRef.id,
              bahiaId: bahiaRef.id,
              numero: `Caja-${String(c).padStart(3, '0')}`,
              capacidad: 20,
              estado: 'disponible',
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      }
    }
  }
}
