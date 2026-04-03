import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { Prestamo, ActaPrestamo } from './entities/prestamo.entity';
import {
  CreatePrestamoDto,
  AprobarPrestamoDto,
  RechazarPrestamoDto,
  RegistrarDevolucionDto,
  RegistrarDanoDto,
} from './dto/prestamo.dto';

@Injectable()
export class PrestamosService {
  private readonly logger = new Logger(PrestamosService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  // ─── Consultas ────────────────────────────────────────────────────────────────

  async findAll(estado?: string): Promise<Prestamo[]> {
    let query: FirebaseFirestore.Query = this.firestore.collection('prestamos');
    if (estado) {
      query = query.where('estado', '==', estado);
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prestamo));
  }

  async findOne(id: string): Promise<Prestamo> {
    const doc = await this.firestore.collection('prestamos').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Préstamo con ID ${id} no encontrado`);
    }
    return { id: doc.id, ...doc.data() } as Prestamo;
  }

  async findByHerramienta(herramientaId: string): Promise<Prestamo[]> {
    const snapshot = await this.firestore
      .collection('prestamos')
      .where('herramientaId', '==', herramientaId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prestamo));
  }

  async findBySolicitante(solicitanteId: string): Promise<Prestamo[]> {
    const snapshot = await this.firestore
      .collection('prestamos')
      .where('solicitanteId', '==', solicitanteId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prestamo));
  }

  // ─── Flujo de préstamo ────────────────────────────────────────────────────────

  async create(dto: CreatePrestamoDto): Promise<Prestamo> {
    const now = new Date().toISOString();
    const prestamoData: Omit<Prestamo, 'id'> = {
      ...dto,
      estado: 'pendiente',
      fechaSolicitud: now,
    };

    const docRef = await this.firestore.collection('prestamos').add(prestamoData);
    return { id: docRef.id, ...prestamoData };
  }

  async aprobar(id: string, dto: AprobarPrestamoDto): Promise<Prestamo> {
    const prestamo = await this.findOne(id);
    if (prestamo.estado !== 'pendiente') {
      throw new BadRequestException(`Solo se pueden aprobar préstamos en estado 'pendiente'. Estado actual: ${prestamo.estado}`);
    }

    const now = new Date().toISOString();
    // Calculate fechaDevolucionEstimada from tiempoEstimadoHoras
    const fechaDevolucionEstimada = new Date(
      Date.now() + prestamo.tiempoEstimadoHoras * 60 * 60 * 1000,
    ).toISOString();

    const updateData: Partial<Prestamo> = {
      estado: 'aprobado',
      aprobadorId: dto.aprobadorId,
      aprobadorNombre: dto.aprobadorNombre,
      fechaAprobacion: now,
      fechaDevolucionEstimada,
    };

    await this.firestore.collection('prestamos').doc(id).update(updateData);
    return { ...prestamo, ...updateData };
  }

  async rechazar(id: string, dto: RechazarPrestamoDto): Promise<Prestamo> {
    const prestamo = await this.findOne(id);
    if (prestamo.estado !== 'pendiente') {
      throw new BadRequestException(`Solo se pueden rechazar préstamos en estado 'pendiente'. Estado actual: ${prestamo.estado}`);
    }

    const updateData: Partial<Prestamo> = {
      estado: 'rechazado',
      aprobadorId: dto.aprobadorId,
      aprobadorNombre: dto.aprobadorNombre,
    };

    // Store rejection motivo in observacionesDevolucion field if provided
    if (dto.motivo) {
      updateData.observacionesDevolucion = `Rechazado: ${dto.motivo}`;
    }

    await this.firestore.collection('prestamos').doc(id).update(updateData);
    return { ...prestamo, ...updateData };
  }

  async registrarRetiro(id: string): Promise<Prestamo> {
    const prestamo = await this.findOne(id);
    if (prestamo.estado !== 'aprobado') {
      throw new BadRequestException(`Solo se puede registrar retiro en préstamos en estado 'aprobado'. Estado actual: ${prestamo.estado}`);
    }

    const now = new Date().toISOString();
    const updateData: Partial<Prestamo> = {
      estado: 'en_uso',
      fechaRetiro: now,
    };

    await this.firestore.collection('prestamos').doc(id).update(updateData);

    // Generate acta de salida
    const actaSalida: Omit<ActaPrestamo, 'id'> = {
      prestamoId: id,
      tipo: 'salida',
      herramientaDescripcion: prestamo.herramientaNombre,
      herramientaPlaca: prestamo.herramientaPlaca,
      herramientaValorActual: 0, // Can be enriched with actual asset value
      solicitanteNombre: prestamo.solicitanteNombre,
      aprobadorNombre: prestamo.aprobadorNombre || '',
      fechaHora: now,
      condicionesResponsabilidad:
        'El solicitante se responsabiliza por el buen uso, cuidado y devolución oportuna de la herramienta. ' +
        'Cualquier daño o pérdida será asumido según el reglamento interno del taller.',
      firmaDigitalSolicitante: true,
      firmaDigitalAprobador: true,
      codigoQR: `QR-PREST-${id}`,
    };

    await this.firestore.collection('actas_prestamo').add(actaSalida);

    return { ...prestamo, ...updateData };
  }

  async registrarDevolucion(id: string, dto: RegistrarDevolucionDto): Promise<Prestamo> {
    const prestamo = await this.findOne(id);
    if (prestamo.estado !== 'en_uso') {
      throw new BadRequestException(`Solo se puede registrar devolución en préstamos en estado 'en_uso'. Estado actual: ${prestamo.estado}`);
    }

    const now = new Date().toISOString();
    const estado = dto.estadoDevolucion === 'danado' ? 'devuelto_con_dano' : 'devuelto';

    const updateData: Partial<Prestamo> = {
      estado,
      fechaDevolucionReal: now,
      estadoDevolucion: dto.estadoDevolucion,
      funcionCompleta: dto.funcionCompleta,
      accesoriosCompletos: dto.accesoriosCompletos,
      limpiezaAceptable: dto.limpiezaAceptable,
      observacionesDevolucion: dto.observacionesDevolucion,
      fotografiaDanoUrl: dto.fotografiaDanoUrl,
    };

    await this.firestore.collection('prestamos').doc(id).update(updateData);

    // Generate acta de devolución
    const actaDevolucion: Omit<ActaPrestamo, 'id'> = {
      prestamoId: id,
      tipo: 'devolucion',
      herramientaDescripcion: prestamo.herramientaNombre,
      herramientaPlaca: prestamo.herramientaPlaca,
      herramientaValorActual: 0,
      solicitanteNombre: prestamo.solicitanteNombre,
      aprobadorNombre: prestamo.aprobadorNombre || '',
      fechaHora: now,
      condicionesResponsabilidad:
        `Herramienta devuelta en estado: ${dto.estadoDevolucion}. ` +
        `Función completa: ${dto.funcionCompleta ? 'Sí' : 'No'}. ` +
        `Accesorios completos: ${dto.accesoriosCompletos ? 'Sí' : 'No'}. ` +
        `Limpieza aceptable: ${dto.limpiezaAceptable ? 'Sí' : 'No'}.`,
      firmaDigitalSolicitante: true,
      firmaDigitalAprobador: true,
      observaciones: dto.observacionesDevolucion,
    };

    await this.firestore.collection('actas_prestamo').add(actaDevolucion);

    return { ...prestamo, ...updateData };
  }

  async registrarDano(id: string, dto: RegistrarDanoDto): Promise<Prestamo> {
    const prestamo = await this.findOne(id);
    if (prestamo.estado !== 'devuelto_con_dano') {
      throw new BadRequestException(`Solo se puede registrar daño en préstamos en estado 'devuelto_con_dano'. Estado actual: ${prestamo.estado}`);
    }

    const updateData: Partial<Prestamo> = {
      tipoDano: dto.tipoDano,
      costoReparacion: dto.costoReparacion,
      costoReposicion: dto.costoReposicion,
      sancion: dto.sancion,
      montoSancion: dto.montoSancion,
    };

    await this.firestore.collection('prestamos').doc(id).update(updateData);
    return { ...prestamo, ...updateData };
  }

  async cerrar(id: string): Promise<Prestamo> {
    const prestamo = await this.findOne(id);
    const estadosCerrables: string[] = ['devuelto', 'devuelto_con_dano', 'rechazado'];
    if (!estadosCerrables.includes(prestamo.estado)) {
      throw new BadRequestException(
        `Solo se pueden cerrar préstamos en estado devuelto, devuelto_con_dano o rechazado. Estado actual: ${prestamo.estado}`,
      );
    }

    const updateData: Partial<Prestamo> = {
      fechaCierre: new Date().toISOString(),
    };

    await this.firestore.collection('prestamos').doc(id).update(updateData);
    return { ...prestamo, ...updateData };
  }

  // ─── Actas ────────────────────────────────────────────────────────────────────

  async getActa(prestamoId: string, tipo: 'salida' | 'devolucion'): Promise<ActaPrestamo> {
    const snapshot = await this.firestore
      .collection('actas_prestamo')
      .where('prestamoId', '==', prestamoId)
      .where('tipo', '==', tipo)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(`Acta de ${tipo} no encontrada para préstamo ${prestamoId}`);
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as ActaPrestamo;
  }

  // ─── Seed ─────────────────────────────────────────────────────────────────────

  async seedData(): Promise<{ prestamos: number; mensaje: string }> {
    const existentes = await this.findAll();
    if (existentes.length > 0) {
      this.logger.log(`Seed omitido: ya existen ${existentes.length} préstamos.`);
      return {
        prestamos: existentes.length,
        mensaje: 'Ya existen préstamos registrados. No se insertó nada.',
      };
    }

    const now = new Date().toISOString();
    const hace2Dias = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const hace5Dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const enFuturo = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

    const prestamosSeed: Array<{ id: string; data: Omit<Prestamo, 'id'> }> = [
      {
        id: 'PREST-001',
        data: {
          herramientaId: 'A003',
          herramientaNombre: 'Torquímetro Digital 1/2"',
          herramientaPlaca: 'ACT-0102',
          solicitanteId: 'user-003',
          solicitanteNombre: 'Miguel Sánchez',
          ordenTrabajo: 'OT-2025-0042',
          motivo: 'Ajuste de torque en suspensión delantera — Sportage 2024',
          tiempoEstimadoHoras: 4,
          aprobadorId: 'user-001',
          aprobadorNombre: 'Carlos Mendoza',
          estado: 'en_uso',
          fechaSolicitud: hace5Dias,
          fechaAprobacion: hace5Dias,
          fechaRetiro: hace2Dias,
          fechaDevolucionEstimada: enFuturo,
        },
      },
      {
        id: 'PREST-002',
        data: {
          herramientaId: 'A001',
          herramientaNombre: 'Scanner Automotriz GDS',
          herramientaPlaca: 'ACT-0045',
          solicitanteId: 'user-002',
          solicitanteNombre: 'Ana Torres',
          ordenTrabajo: 'OT-2025-0055',
          motivo: 'Diagnóstico módulo ABS — Sorento 2023',
          tiempoEstimadoHoras: 2,
          estado: 'pendiente',
          fechaSolicitud: now,
        },
      },
      {
        id: 'PREST-003',
        data: {
          herramientaId: 'A003',
          herramientaNombre: 'Torquímetro Digital 1/2"',
          herramientaPlaca: 'ACT-0102',
          solicitanteId: 'user-004',
          solicitanteNombre: 'Roberto Gómez',
          ordenTrabajo: 'OT-2025-0038',
          motivo: 'Torque de ruedas para entrega de EV6',
          tiempoEstimadoHoras: 1,
          aprobadorId: 'user-001',
          aprobadorNombre: 'Carlos Mendoza',
          estado: 'devuelto',
          fechaSolicitud: hace5Dias,
          fechaAprobacion: hace5Dias,
          fechaRetiro: hace5Dias,
          fechaDevolucionEstimada: hace5Dias,
          fechaDevolucionReal: hace2Dias,
          estadoDevolucion: 'bueno',
          funcionCompleta: true,
          accesoriosCompletos: true,
          limpiezaAceptable: true,
          fechaCierre: hace2Dias,
        },
      },
    ];

    for (const { id, data } of prestamosSeed) {
      await this.firestore.collection('prestamos').doc(id).set(data);
    }

    // Generate acta de salida for PREST-001
    const actaSalida: Omit<ActaPrestamo, 'id'> = {
      prestamoId: 'PREST-001',
      tipo: 'salida',
      herramientaDescripcion: 'Torquímetro Digital 1/2"',
      herramientaPlaca: 'ACT-0102',
      herramientaValorActual: 650,
      solicitanteNombre: 'Miguel Sánchez',
      aprobadorNombre: 'Carlos Mendoza',
      fechaHora: hace2Dias,
      condicionesResponsabilidad:
        'El solicitante se responsabiliza por el buen uso, cuidado y devolución oportuna de la herramienta. ' +
        'Cualquier daño o pérdida será asumido según el reglamento interno del taller.',
      firmaDigitalSolicitante: true,
      firmaDigitalAprobador: true,
      codigoQR: 'QR-PREST-001',
    };

    await this.firestore.collection('actas_prestamo').add(actaSalida);

    this.logger.log(`Seed completado: ${prestamosSeed.length} préstamos insertados.`);
    return {
      prestamos: prestamosSeed.length,
      mensaje: `Seed completado: ${prestamosSeed.length} préstamos insertados.`,
    };
  }
}
