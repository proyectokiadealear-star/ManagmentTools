import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { Inspeccion, FotoInspeccion, Discrepancia } from './entities/inspeccion.entity';
import {
  CreateInspeccionDto,
  AgregarFotoDto,
  AgregarDiscrepanciaDto,
  ResolverDiscrepanciaDto,
  CompletarInspeccionDto,
} from './dto/inspeccion.dto';

@Injectable()
export class InspeccionesService implements OnModuleInit {
  private readonly logger = new Logger(InspeccionesService.name);
  private readonly COLLECTION = 'inspecciones';

  constructor(private readonly firebaseService: FirebaseService) {}

  async onModuleInit() {
    await this.seedData();
  }

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  async findAll(estado?: string): Promise<Inspeccion[]> {
    let query: FirebaseFirestore.Query = this.firestore.collection(this.COLLECTION);
    if (estado) {
      query = query.where('estado', '==', estado);
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inspeccion));
  }

  async findOne(id: string): Promise<Inspeccion> {
    const doc = await this.firestore.collection(this.COLLECTION).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Inspección con ID ${id} no encontrada`);
    }
    return { id: doc.id, ...doc.data() } as Inspeccion;
  }

  async findByArea(areaId: string): Promise<Inspeccion[]> {
    const snapshot = await this.firestore
      .collection(this.COLLECTION)
      .where('areaId', '==', areaId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inspeccion));
  }

  async findPendientes(): Promise<Inspeccion[]> {
    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get programadas
    const programadasSnap = await this.firestore
      .collection(this.COLLECTION)
      .where('estado', '==', 'programada')
      .get();

    const programadas = programadasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inspeccion));

    // Filter: estado='programada' OR fechaProgramada <= today
    return programadas.filter(i => i.estado === 'programada' || i.fechaProgramada <= hoy);
  }

  // ─── Commands ────────────────────────────────────────────────────────────────

  async create(dto: CreateInspeccionDto): Promise<Inspeccion> {
    const now = new Date().toISOString();
    const fechaProgramada = dto.fechaProgramada;

    // Auto-schedule next inspection 7 days after programmed date
    const proximaDate = new Date(fechaProgramada);
    proximaDate.setDate(proximaDate.getDate() + 7);
    const proximaInspeccion = proximaDate.toISOString().split('T')[0];

    const inspeccion: Omit<Inspeccion, 'id'> = {
      areaId: dto.areaId,
      areaNombre: dto.areaNombre,
      cajaId: dto.cajaId,
      cajaNombre: dto.cajaNombre,
      tecnicoResponsableId: dto.tecnicoResponsableId,
      tecnicoResponsableNombre: dto.tecnicoResponsableNombre,
      inspectorId: dto.inspectorId,
      inspectorNombre: dto.inspectorNombre,
      estado: 'programada',
      fechaProgramada,
      fotoBaseUrl: dto.fotoBaseUrl,
      fotosNuevas: [],
      discrepancias: [],
      proximaInspeccion,
      fechaCreacion: now,
    };

    const docRef = await this.firestore.collection(this.COLLECTION).add(inspeccion);
    return { id: docRef.id, ...inspeccion };
  }

  async agregarFoto(id: string, dto: AgregarFotoDto): Promise<Inspeccion> {
    const inspeccion = await this.findOne(id);

    const foto: FotoInspeccion = {
      url: dto.url,
      angulo: dto.angulo,
      fechaCaptura: new Date().toISOString(),
      validada: true,
    };

    inspeccion.fotosNuevas.push(foto);

    // If first action, move to en_proceso
    if (inspeccion.estado === 'programada') {
      inspeccion.estado = 'en_proceso';
    }

    await this.firestore.collection(this.COLLECTION).doc(id).update({
      fotosNuevas: inspeccion.fotosNuevas,
      estado: inspeccion.estado,
    });

    return inspeccion;
  }

  async agregarDiscrepancia(id: string, dto: AgregarDiscrepanciaDto): Promise<Inspeccion> {
    const inspeccion = await this.findOne(id);

    const discrepancia: Discrepancia = {
      descripcion: dto.descripcion,
      tipo: dto.tipo,
      herramientaAfectada: dto.herramientaAfectada,
      ultimaVezConfirmada: dto.ultimaVezConfirmada,
      reporteGenerado: false,
    };

    inspeccion.discrepancias.push(discrepancia);
    inspeccion.estado = 'con_discrepancia';

    await this.firestore.collection(this.COLLECTION).doc(id).update({
      discrepancias: inspeccion.discrepancias,
      estado: 'con_discrepancia',
    });

    return inspeccion;
  }

  async resolverDiscrepancia(id: string, dto: ResolverDiscrepanciaDto): Promise<Inspeccion> {
    const inspeccion = await this.findOne(id);
    const idx = dto.discrepanciaIdx;

    if (idx < 0 || idx >= inspeccion.discrepancias.length) {
      throw new BadRequestException(
        `Índice de discrepancia ${idx} fuera de rango. La inspección tiene ${inspeccion.discrepancias.length} discrepancias.`,
      );
    }

    inspeccion.discrepancias[idx].resultado = dto.resultado;
    if (dto.observacion) {
      inspeccion.discrepancias[idx].observacion = dto.observacion;
    }

    await this.firestore.collection(this.COLLECTION).doc(id).update({
      discrepancias: inspeccion.discrepancias,
    });

    return inspeccion;
  }

  async completar(id: string, dto: CompletarInspeccionDto): Promise<Inspeccion> {
    const inspeccion = await this.findOne(id);
    const now = new Date();

    // Auto-schedule next inspection 7 days after completion
    const proximaDate = new Date(now);
    proximaDate.setDate(proximaDate.getDate() + 7);

    inspeccion.estado = 'completada';
    inspeccion.fechaRealizacion = now.toISOString();
    inspeccion.proximaInspeccion = proximaDate.toISOString().split('T')[0];

    if (dto.observacionesGenerales) {
      inspeccion.observacionesGenerales = dto.observacionesGenerales;
    }

    await this.firestore.collection(this.COLLECTION).doc(id).update({
      estado: inspeccion.estado,
      fechaRealizacion: inspeccion.fechaRealizacion,
      proximaInspeccion: inspeccion.proximaInspeccion,
      observacionesGenerales: inspeccion.observacionesGenerales ?? null,
    });

    // ─── Auto-create next inspection with photo rotation ───────────────
    // La última foto nueva de esta inspección se convierte en la fotoBase
    // de la próxima inspección (referencia para comparar).
    const ultimaFotoNueva = inspeccion.fotosNuevas.length > 0
      ? inspeccion.fotosNuevas[inspeccion.fotosNuevas.length - 1].url
      : inspeccion.fotoBaseUrl; // si no hay fotos nuevas, reusar la base actual

    const nextId = `INSP-AUTO-${Date.now()}`;
    const nextInspeccion: Omit<Inspeccion, 'id'> = {
      areaId: inspeccion.areaId,
      areaNombre: inspeccion.areaNombre,
      cajaId: inspeccion.cajaId,
      cajaNombre: inspeccion.cajaNombre,
      tecnicoResponsableId: inspeccion.tecnicoResponsableId,
      tecnicoResponsableNombre: inspeccion.tecnicoResponsableNombre,
      inspectorId: inspeccion.inspectorId,
      inspectorNombre: inspeccion.inspectorNombre,
      estado: 'programada',
      fechaProgramada: inspeccion.proximaInspeccion!,
      fotoBaseUrl: ultimaFotoNueva, // ← la foto nueva se vuelve la referencia
      fotosNuevas: [],
      discrepancias: [],
      proximaInspeccion: undefined,
      fechaCreacion: now.toISOString(),
    };

    await this.firestore.collection(this.COLLECTION).doc(nextId).set(nextInspeccion);
    this.logger.log(
      `Inspección ${id} completada → próxima inspección ${nextId} creada para ${inspeccion.proximaInspeccion} con fotoBase rotada.`,
    );

    return inspeccion;
  }

  // ─── Seed ────────────────────────────────────────────────────────────────────

  async seedData(): Promise<{ inspecciones: number; mensaje: string }> {
    const existentes = await this.findAll();
    if (existentes.length > 0) {
      this.logger.log(`Seed omitido: ya existen ${existentes.length} inspecciones.`);
      return {
        inspecciones: existentes.length,
        mensaje: 'Ya existen inspecciones. No se insertó nada.',
      };
    }

    const now = new Date();
    const hoy = now.toISOString().split('T')[0];
    const enUnaSemana = new Date(now);
    enUnaSemana.setDate(enUnaSemana.getDate() + 7);
    const proximaSemana = enUnaSemana.toISOString().split('T')[0];

    const seedData: Array<{ id: string; data: Omit<Inspeccion, 'id'> }> = [
      {
        id: 'INSP-001',
        data: {
          areaId: 'area-taller',
          areaNombre: 'Taller Mecánico',
          cajaId: 'caja-mesa-mendoza',
          cajaNombre: 'Caja-001 de Carlos Mendoza',
          tecnicoResponsableId: 'usr-tech-01',
          tecnicoResponsableNombre: 'Carlos Mendoza',
          inspectorId: 'usr-insp-01',
          inspectorNombre: 'María López',
          estado: 'programada',
          fechaProgramada: hoy,
          fotoBaseUrl: 'https://images.unsplash.com/photo-1530825894095-9c184b068fcb?w=500',
          fotosNuevas: [],
          discrepancias: [],
          proximaInspeccion: proximaSemana,
          fechaCreacion: now.toISOString(),
        },
      },
      {
        id: 'INSP-002',
        data: {
          areaId: 'area-bodega',
          areaNombre: 'Bodega de Repuestos',
          cajaId: 'caja-estante-b2',
          cajaNombre: 'Caja-012 de Luis Pérez',
          tecnicoResponsableId: 'usr-tech-02',
          tecnicoResponsableNombre: 'Luis Pérez',
          inspectorId: 'usr-insp-02',
          inspectorNombre: 'Jorge Ramírez',
          estado: 'con_discrepancia',
          fechaProgramada: hoy,
          fechaRealizacion: now.toISOString(),
          fotoBaseUrl: 'https://images.unsplash.com/photo-1635425896336-12158652614a?w=500',
          fotosNuevas: [
            {
              url: 'https://images.unsplash.com/photo-1635425896336-12158652614a?w=500',
              angulo: 'frontal',
              fechaCaptura: now.toISOString(),
              validada: true,
            },
          ],
          discrepancias: [
            {
              descripcion: 'Torquímetro Digital 1/2" no se encuentra en su posición',
              tipo: 'herramienta_ausente',
              herramientaAfectada: 'Torquímetro Digital 1/2"',
              ultimaVezConfirmada: '2025-07-01',
              reporteGenerado: false,
            },
          ],
          proximaInspeccion: proximaSemana,
          fechaCreacion: now.toISOString(),
        },
      },
    ];

    for (const { id, data } of seedData) {
      await this.firestore.collection(this.COLLECTION).doc(id).set(data);
    }

    this.logger.log(`Seed completado: ${seedData.length} inspecciones insertadas.`);
    return {
      inspecciones: seedData.length,
      mensaje: `Seed completado: ${seedData.length} inspecciones insertadas.`,
    };
  }
}
