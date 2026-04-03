import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { Cotizacion, Proforma } from './entities/cotizacion.entity';
import {
  CreateCotizacionDto,
  AddProformaDto,
  SeleccionarProformaDto,
  AprobarCotizacionDto,
  RechazarCotizacionDto,
  EjecutarCotizacionDto,
} from './dto/cotizacion.dto';

@Injectable()
export class CotizacionesService {
  private readonly logger = new Logger(CotizacionesService.name);
  private readonly collection = 'cotizaciones';

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  // ─── Listar cotizaciones (filtro opcional por estado) ────────────────────────
  async findAll(estado?: string): Promise<Cotizacion[]> {
    let query: FirebaseFirestore.Query = this.firestore.collection(this.collection);
    if (estado) {
      query = query.where('estado', '==', estado);
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cotizacion));
  }

  // ─── Obtener una cotización por ID ───────────────────────────────────────────
  async findOne(id: string): Promise<Cotizacion> {
    const doc = await this.firestore.collection(this.collection).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    }
    return { id: doc.id, ...doc.data() } as Cotizacion;
  }

  // ─── Crear cotización ────────────────────────────────────────────────────────
  async create(dto: CreateCotizacionDto): Promise<Cotizacion> {
    const now = new Date().toISOString();
    const data: Omit<Cotizacion, 'id'> = {
      activoId: dto.activoId,
      activoNombre: dto.activoNombre,
      fallaId: dto.fallaId,
      tipo: dto.tipo,
      descripcion: dto.descripcion,
      montoEstimado: dto.montoEstimado,
      solicitadoPor: dto.solicitadoPor,
      proformas: [],
      estado: 'solicitando_proformas',
      fechaCreacion: now,
    };

    const docRef = await this.firestore.collection(this.collection).add(data);
    return { id: docRef.id, ...data };
  }

  // ─── Agregar proforma ────────────────────────────────────────────────────────
  async addProforma(id: string, dto: AddProformaDto): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);

    const proforma: Proforma = {
      proveedorNombre: dto.proveedorNombre,
      monto: dto.monto,
      tiempoEjecucionDias: dto.tiempoEjecucionDias,
      garantiaMeses: dto.garantiaMeses,
      incluyeRepuestos: dto.incluyeRepuestos,
      vigenciaOfertaDias: dto.vigenciaOfertaDias,
      documentoUrl: dto.documentoUrl,
      fechaRecepcion: new Date().toISOString(),
    };

    const proformas = [...cotizacion.proformas, proforma];
    const update: Partial<Cotizacion> = { proformas };

    if (proformas.length >= 3) {
      update.estado = 'comparando';
    }

    await this.firestore.collection(this.collection).doc(id).update(update);
    return { ...cotizacion, ...update };
  }

  // ─── Seleccionar proforma ────────────────────────────────────────────────────
  async seleccionar(id: string, dto: SeleccionarProformaDto): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);

    if (dto.proformaSeleccionadaIdx < 0 || dto.proformaSeleccionadaIdx >= cotizacion.proformas.length) {
      throw new BadRequestException(
        `Índice ${dto.proformaSeleccionadaIdx} fuera de rango. Hay ${cotizacion.proformas.length} proformas.`,
      );
    }

    const update: Partial<Cotizacion> = {
      proformaSeleccionadaIdx: dto.proformaSeleccionadaIdx,
      justificacionSeleccion: dto.justificacionSeleccion,
      estado: 'pendiente_aprobacion',
    };

    await this.firestore.collection(this.collection).doc(id).update(update);
    return { ...cotizacion, ...update };
  }

  // ─── Aprobar cotización ──────────────────────────────────────────────────────
  async aprobar(id: string, dto: AprobarCotizacionDto): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);
    const now = new Date();

    // Calcular tiempoRespuestaGerencia (minutos desde la 3.ª proforma hasta ahora)
    let tiempoRespuestaGerencia: number | undefined;
    if (cotizacion.proformas.length >= 3) {
      const fechaTerceraProforma = new Date(cotizacion.proformas[2].fechaRecepcion);
      tiempoRespuestaGerencia = Math.round((now.getTime() - fechaTerceraProforma.getTime()) / 60000);
    }

    const update: Partial<Cotizacion> = {
      aprobadoPor: dto.aprobadoPor,
      evidenciaAprobacion: dto.evidenciaAprobacion,
      fechaAprobacion: now.toISOString(),
      estado: 'aprobada',
      tiempoRespuestaGerencia,
    };

    await this.firestore.collection(this.collection).doc(id).update(update);
    return { ...cotizacion, ...update };
  }

  // ─── Rechazar cotización ─────────────────────────────────────────────────────
  async rechazar(id: string, dto: RechazarCotizacionDto): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);

    const update: Partial<Cotizacion> = {
      justificacionDescarte: dto.justificacionDescarte,
      estado: 'rechazada',
    };

    await this.firestore.collection(this.collection).doc(id).update(update);
    return { ...cotizacion, ...update };
  }

  // ─── Ejecutar cotización ─────────────────────────────────────────────────────
  async ejecutar(id: string, dto: EjecutarCotizacionDto): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);

    const update: Partial<Cotizacion> = {
      costoFinalEjecutado: dto.costoFinalEjecutado,
      estado: 'ejecutada',
    };

    await this.firestore.collection(this.collection).doc(id).update(update);
    return { ...cotizacion, ...update };
  }

  // ─── Seed de datos de prueba ─────────────────────────────────────────────────
  async seedData(): Promise<{ cotizaciones: number; mensaje: string }> {
    const existentes = await this.findAll();
    if (existentes.length > 0) {
      this.logger.log(`Seed omitido: ya existen ${existentes.length} cotizaciones.`);
      return {
        cotizaciones: existentes.length,
        mensaje: 'Ya existen cotizaciones. No se insertó nada.',
      };
    }

    const now = new Date().toISOString();
    const hace2Dias = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const hace1Dia = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const hace12Horas = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    const seeds: Array<{ id: string; data: Omit<Cotizacion, 'id'> }> = [
      {
        id: 'COT-001',
        data: {
          activoId: 'A005',
          activoNombre: 'Alineadora 3D HawkEye',
          tipo: 'correctivo',
          descripcion: 'Reparación de sensor de alineación delantero izquierdo',
          montoEstimado: 1200.0,
          solicitadoPor: 'user-jefe-001',
          estado: 'pendiente_aprobacion',
          proformas: [
            {
              proveedorNombre: 'Equipos Automotrices Cia Ltda',
              monto: 1150.0,
              tiempoEjecucionDias: 5,
              garantiaMeses: 6,
              incluyeRepuestos: true,
              vigenciaOfertaDias: 30,
              fechaRecepcion: hace2Dias,
            },
            {
              proveedorNombre: 'TechAuto Solutions',
              monto: 1350.0,
              tiempoEjecucionDias: 3,
              garantiaMeses: 12,
              incluyeRepuestos: true,
              vigenciaOfertaDias: 15,
              fechaRecepcion: hace1Dia,
            },
            {
              proveedorNombre: 'ServiParts Ecuador',
              monto: 980.0,
              tiempoEjecucionDias: 7,
              garantiaMeses: 3,
              incluyeRepuestos: false,
              vigenciaOfertaDias: 20,
              fechaRecepcion: hace12Horas,
            },
          ],
          proformaSeleccionadaIdx: 0,
          justificacionSeleccion: 'Mejor relación precio/garantía',
          fechaCreacion: hace2Dias,
        },
      },
      {
        id: 'COT-002',
        data: {
          activoId: 'A003',
          activoNombre: 'Torquímetro Digital 1/2"',
          tipo: 'preventivo_mayor',
          descripcion: 'Calibración y reemplazo de display digital',
          montoEstimado: 400.0,
          solicitadoPor: 'user-jefe-001',
          estado: 'solicitando_proformas',
          proformas: [
            {
              proveedorNombre: 'Snap-on Tools Ecuador',
              monto: 380.0,
              tiempoEjecucionDias: 10,
              garantiaMeses: 6,
              incluyeRepuestos: true,
              vigenciaOfertaDias: 30,
              fechaRecepcion: hace1Dia,
            },
          ],
          fechaCreacion: hace1Dia,
        },
      },
    ];

    for (const { id, data } of seeds) {
      await this.firestore.collection(this.collection).doc(id).set(data);
    }

    this.logger.log(`Seed completado: ${seeds.length} cotizaciones insertadas.`);
    return {
      cotizaciones: seeds.length,
      mensaje: `Seed completado: ${seeds.length} cotizaciones insertadas.`,
    };
  }
}
