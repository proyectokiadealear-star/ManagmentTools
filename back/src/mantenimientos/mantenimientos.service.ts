import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { Mantenimiento } from './entities/mantenimiento.entity';
import {
  ProgramacionMantenimiento,
  ProgramacionConSemaforo,
  SemaforoEstado,
  EstadoProgramacion,
} from './entities/programacion-mantenimiento.entity';
import {
  CreateProgramacionDto,
  UpdateProgramacionDto,
  CreateMantenimientoDto,
} from './dto/mantenimiento.dto';

@Injectable()
export class MantenimientosService {
  private readonly logger = new Logger(MantenimientosService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore() {
    return this.firebaseService.getFirestore();
  }

  // ─── Semáforo ────────────────────────────────────────────────────────────────

  private calcularSemaforo(proximoMantenimiento: string): { semaforo: SemaforoEstado; diasRestantes: number } {
    const hoy = new Date();
    const proximo = new Date(proximoMantenimiento);
    const diasRestantes = Math.ceil((proximo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    let semaforo: SemaforoEstado = 'verde';
    if (diasRestantes <= 0) semaforo = 'rojo';
    else if (diasRestantes <= 7) semaforo = 'naranja';
    else if (diasRestantes <= 15) semaforo = 'amarillo';
    else if (diasRestantes <= 30) semaforo = 'amarillo';

    return { semaforo, diasRestantes };
  }

  // ─── Programación ────────────────────────────────────────────────────────────

  async findAllProgramacion(): Promise<ProgramacionConSemaforo[]> {
    const snapshot = await this.firestore.collection('programacion_mantenimiento').get();
    return snapshot.docs.map((doc: any) => {
      const data = { id: doc.id, ...doc.data() } as ProgramacionMantenimiento;
      const { semaforo, diasRestantes } = this.calcularSemaforo(data.proximoMantenimiento);
      return { ...data, semaforo, diasRestantes } as ProgramacionConSemaforo;
    });
  }

  async findAlertasProgramacion(): Promise<ProgramacionConSemaforo[]> {
    const todas = await this.findAllProgramacion();
    return todas.filter((p) => p.semaforo !== 'verde');
  }

  async createProgramacion(dto: CreateProgramacionDto, creadoPor: string): Promise<ProgramacionConSemaforo> {
    const { semaforo, diasRestantes } = this.calcularSemaforo(dto.proximoMantenimiento);

    let estado: EstadoProgramacion = 'vigente';
    if (diasRestantes <= 0) estado = 'vencido';
    else if (diasRestantes <= 15) estado = 'proximo';

    const now = new Date().toISOString();
    const programacion: Omit<ProgramacionMantenimiento, 'id'> = {
      ...dto,
      estado,
      creadoPor,
      fechaCreacion: now,
    };

    const docRef = await this.firestore.collection('programacion_mantenimiento').add(programacion);
    return { id: docRef.id, ...programacion, semaforo, diasRestantes };
  }

  async updateProgramacion(id: string, dto: UpdateProgramacionDto): Promise<ProgramacionConSemaforo> {
    const docRef = this.firestore.collection('programacion_mantenimiento').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Programación con ID ${id} no encontrada`);
    }

    const existing = { id: doc.id, ...doc.data() } as ProgramacionMantenimiento;
    const updated = { ...existing, ...dto };

    await docRef.update(dto as any);

    const { semaforo, diasRestantes } = this.calcularSemaforo(updated.proximoMantenimiento);
    return { ...updated, semaforo, diasRestantes };
  }

  async deleteProgramacion(id: string): Promise<{ message: string }> {
    const docRef = this.firestore.collection('programacion_mantenimiento').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Programación con ID ${id} no encontrada`);
    }
    await docRef.delete();
    return { message: `Programación ${id} eliminada correctamente` };
  }

  // ─── Mantenimientos ejecutados ───────────────────────────────────────────────

  async findAllMantenimientos(activoId?: string): Promise<Mantenimiento[]> {
    let query: any = this.firestore.collection('mantenimientos');
    if (activoId) {
      query = query.where('activoId', '==', activoId);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Mantenimiento));
  }

  async findOneMantenimiento(id: string): Promise<Mantenimiento> {
    const doc = await this.firestore.collection('mantenimientos').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Mantenimiento con ID ${id} no encontrado`);
    }
    return { id: doc.id, ...doc.data() } as Mantenimiento;
  }

  async createMantenimiento(dto: CreateMantenimientoDto, creadoPor: string): Promise<Mantenimiento> {
    const now = new Date().toISOString();

    const mantenimiento: Omit<Mantenimiento, 'id'> = {
      activoId: dto.activoId,
      tipo: dto.tipo,
      descripcion: dto.descripcion,
      proveedorId: dto.proveedorId,
      proveedorNombre: dto.proveedorNombre,
      costoFinal: dto.costoFinal,
      fechaProgramada: dto.fechaProgramada,
      fechaRealizada: dto.fechaRealizada,
      evidenciaUrls: dto.evidenciaUrls || [],
      actaCalibracion: dto.actaCalibracion,
      observaciones: dto.observaciones || '',
      realizadoPor: dto.realizadoPor,
      creadoPor,
      fechaCreacion: now,
    };

    const docRef = await this.firestore.collection('mantenimientos').add(mantenimiento);

    // Update associated programacion — reset proximoMantenimiento
    if (dto.tipo === 'preventivo' || dto.tipo === 'calibracion') {
      const progSnapshot = await this.firestore
        .collection('programacion_mantenimiento')
        .where('activoId', '==', dto.activoId)
        .where('tipo', '==', dto.tipo)
        .get();

      for (const progDoc of progSnapshot.docs) {
        const progData = progDoc.data() as ProgramacionMantenimiento;
        const nuevaFecha = new Date(dto.fechaRealizada);
        nuevaFecha.setDate(nuevaFecha.getDate() + progData.periodicidadDias);

        await this.firestore.collection('programacion_mantenimiento').doc(progDoc.id).update({
          ultimoMantenimiento: dto.fechaRealizada,
          proximoMantenimiento: nuevaFecha.toISOString().split('T')[0],
          estado: 'vigente',
        });
      }
    }

    return { id: docRef.id, ...mantenimiento };
  }

  async getHistorialActivo(activoId: string): Promise<Mantenimiento[]> {
    const snapshot = await this.firestore
      .collection('mantenimientos')
      .where('activoId', '==', activoId)
      .orderBy('fechaRealizada', 'desc')
      .get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Mantenimiento));
  }

  // ─── Seed ────────────────────────────────────────────────────────────────────

  async seedData(): Promise<{ programaciones: number; mantenimientos: number; mensaje: string }> {
    const existentes = await this.firestore.collection('programacion_mantenimiento').get();
    if (!existentes.empty) {
      this.logger.log(`Seed omitido: ya existen ${existentes.docs.length} programaciones.`);
      return {
        programaciones: existentes.docs.length,
        mantenimientos: 0,
        mensaje: 'Ya existen datos de mantenimiento. No se insertó nada.',
      };
    }

    const now = new Date().toISOString();
    const hoy = new Date();

    // ─── 3 Programaciones ──────────────────────────────────────────
    const programaciones: Array<{ id: string; data: Omit<ProgramacionMantenimiento, 'id'> }> = [
      {
        id: 'prog-001',
        data: {
          activoId: 'A001',
          activoNombre: 'Scanner Automotriz GDS',
          tipo: 'calibracion',
          periodicidadDias: 365,
          ultimoMantenimiento: '2025-01-15',
          proximoMantenimiento: '2026-01-15',
          proveedorHabitual: 'KIA Service Center',
          responsableId: 'user-001',
          responsableNombre: 'Carlos Mendoza',
          estado: 'vigente',
          creadoPor: 'seed',
          fechaCreacion: now,
        },
      },
      {
        id: 'prog-002',
        data: {
          activoId: 'A003',
          activoNombre: 'Torquímetro Digital 1/2"',
          tipo: 'calibracion',
          periodicidadDias: 180,
          ultimoMantenimiento: '2025-06-01',
          proximoMantenimiento: (() => {
            const d = new Date(hoy);
            d.setDate(d.getDate() + 5);
            return d.toISOString().split('T')[0];
          })(),
          proveedorHabitual: 'Snap-on Service Center',
          responsableId: 'user-003',
          responsableNombre: 'Luis Pérez',
          estado: 'proximo',
          creadoPor: 'seed',
          fechaCreacion: now,
        },
      },
      {
        id: 'prog-003',
        data: {
          activoId: 'A005',
          activoNombre: 'Alineadora 3D',
          tipo: 'preventivo',
          periodicidadDias: 90,
          ultimoMantenimiento: '2025-09-01',
          proximoMantenimiento: (() => {
            const d = new Date(hoy);
            d.setDate(d.getDate() - 3);
            return d.toISOString().split('T')[0];
          })(),
          proveedorHabitual: 'Equipos Automotrices Cia Ltda',
          responsableId: 'user-005',
          responsableNombre: 'Miguel Sánchez',
          estado: 'vencido',
          creadoPor: 'seed',
          fechaCreacion: now,
        },
      },
    ];

    for (const { id, data } of programaciones) {
      await this.firestore.collection('programacion_mantenimiento').doc(id).set(data);
    }

    // ─── 2 Mantenimientos ejecutados ───────────────────────────────
    const mantenimientos: Array<{ id: string; data: Omit<Mantenimiento, 'id'> }> = [
      {
        id: 'mant-001',
        data: {
          activoId: 'A001',
          tipo: 'calibracion',
          descripcion: 'Calibración anual de scanner — firmware actualizado a v4.2',
          proveedorNombre: 'KIA Service Center',
          costoFinal: 180.0,
          fechaProgramada: '2025-01-15',
          fechaRealizada: '2025-01-15',
          evidenciaUrls: [],
          observaciones: 'Equipo calibrado correctamente, firmware actualizado',
          realizadoPor: 'Carlos Mendoza',
          creadoPor: 'seed',
          fechaCreacion: now,
        },
      },
      {
        id: 'mant-002',
        data: {
          activoId: 'A005',
          tipo: 'preventivo',
          descripcion: 'Mantenimiento preventivo trimestral — limpieza de sensores y calibración',
          proveedorNombre: 'Equipos Automotrices Cia Ltda',
          costoFinal: 420.0,
          fechaProgramada: '2025-09-01',
          fechaRealizada: '2025-09-01',
          evidenciaUrls: [],
          observaciones: 'Sensores calibrados, alineación verificada',
          realizadoPor: 'Miguel Sánchez',
          creadoPor: 'seed',
          fechaCreacion: now,
        },
      },
    ];

    for (const { id, data } of mantenimientos) {
      await this.firestore.collection('mantenimientos').doc(id).set(data);
    }

    this.logger.log(`Seed completado: ${programaciones.length} programaciones + ${mantenimientos.length} mantenimientos.`);
    return {
      programaciones: programaciones.length,
      mantenimientos: mantenimientos.length,
      mensaje: `Seed completado: ${programaciones.length} programaciones + ${mantenimientos.length} mantenimientos.`,
    };
  }
}
