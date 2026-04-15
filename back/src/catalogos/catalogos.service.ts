import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { Firestore } from 'firebase-admin/firestore';
import { CatalogoItem, CatalogoTipo } from './entities/catalogo-item.entity';
import { CreateCatalogoItemDto, UpdateCatalogoItemDto } from './dto/create-catalogo-item.dto';
import { Sede } from '../common/enums/sede.enum';

@Injectable()
export class CatalogosService {
  private readonly logger = new Logger(CatalogosService.name);
  private readonly COLLECTION = 'catalogos';
  private readonly BASE_SEDES: readonly string[] = [
    Sede.SURMOTOR,
    Sede.GRANDA_CENTENO,
    Sede.SHYRIS,
  ];

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  private normalizeSedeNombre(value?: string): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .toUpperCase();
  }

  private async ensureBaseSedes(): Promise<void> {
    const snapshot = await this.firestore
      .collection(this.COLLECTION)
      .where('catalogo', '==', 'sede')
      .get();

    const existentes = new Set(
      snapshot.docs
        .map(doc => this.normalizeSedeNombre((doc.data() as { nombre?: string }).nombre))
        .filter((nombre): nombre is string => !!nombre),
    );

    const faltantes = this.BASE_SEDES.filter(sede => !existentes.has(sede));
    if (faltantes.length === 0) return;

    const now = new Date().toISOString();
    await Promise.all(
      faltantes.map(nombre =>
        this.firestore.collection(this.COLLECTION).add({
          catalogo: 'sede',
          nombre,
          parentId: null,
          activo: true,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );

    this.logger.log(`ensureBaseSedes: agregadas ${faltantes.length} sedes base (${faltantes.join(', ')})`);
  }

  async findAll(catalogo?: string, parentId?: string): Promise<CatalogoItem[]> {
    this.logger.log(`findAll: catalogo=${catalogo ?? 'all'}, parentId=${parentId ?? 'none'}`);

    if (catalogo === 'sede' && !parentId) {
      await this.ensureBaseSedes();
    }

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

    // Filtrar campos undefined para evitar error de Firestore
    const data = Object.fromEntries(
      Object.entries(dto).filter(([_, v]) => v !== undefined),
    );

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No hay campos válidos para actualizar');
    }

    const updates = { ...data, updatedAt: new Date().toISOString() };
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
