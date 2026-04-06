import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { Firestore } from 'firebase-admin/firestore';
import { CatalogoItem, CatalogoTipo } from './entities/catalogo-item.entity';
import { CreateCatalogoItemDto, UpdateCatalogoItemDto } from './dto/create-catalogo-item.dto';

@Injectable()
export class CatalogosService {
  private readonly logger = new Logger(CatalogosService.name);
  private readonly COLLECTION = 'catalogos';

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  async findAll(catalogo?: string, parentId?: string): Promise<CatalogoItem[]> {
    this.logger.log(`findAll: catalogo=${catalogo ?? 'all'}, parentId=${parentId ?? 'none'}`);
    let query: FirebaseFirestore.Query = this.firestore.collection(this.COLLECTION);

    if (catalogo) {
      query = query.where('catalogo', '==', catalogo);
    }
    if (parentId) {
      query = query.where('parentId', '==', parentId);
    }

    const snapshot = await query.get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CatalogoItem));
    this.logger.log(`findAll: ${items.length} items found`);
    return items.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async findOne(id: string): Promise<CatalogoItem> {
    const doc = await this.firestore.collection(this.COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Catálogo item ${id} no encontrado`);
    return { id: doc.id, ...doc.data() } as CatalogoItem;
  }

  async create(dto: CreateCatalogoItemDto): Promise<CatalogoItem> {
    this.logger.log(`create: catalogo=${dto.catalogo}, nombre=${dto.nombre}`);
    const now = new Date().toISOString();
    const data = {
      catalogo: dto.catalogo,
      nombre: dto.nombre,
      parentId: dto.parentId ?? null,
      activo: true,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await this.firestore.collection(this.COLLECTION).add(data);
    this.logger.log(`create: doc created with id=${docRef.id}`);
    return { id: docRef.id, ...data } as CatalogoItem;
  }

  async update(id: string, dto: UpdateCatalogoItemDto): Promise<CatalogoItem> {
    const docRef = this.firestore.collection(this.COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException(`Catálogo item ${id} no encontrado`);

    const updates = { ...dto, updatedAt: new Date().toISOString() };
    await docRef.update(updates);

    return { id: doc.id, ...doc.data(), ...updates } as CatalogoItem;
  }

  async remove(id: string): Promise<void> {
    const docRef = this.firestore.collection(this.COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException(`Catálogo item ${id} no encontrado`);
    await docRef.delete();
  }
}
