import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import {
  PeriodoResponsabilidad,
  PermisoResponsabilidad,
} from './entities/periodo-responsabilidad.entity';
import { PersonalTaller } from './entities/personal-taller.entity';
import { CreatePeriodoDto } from './dto/create-periodo.dto';
import { CreatePersonalDto } from './dto/create-personal.dto';

export interface ResultadoCreacion {
  ok: true;
  periodo: PeriodoResponsabilidad;
}

export interface ResultadoDuplicado {
  ok: false;
  razon: 'duplicado';
  periodoExistente: PeriodoResponsabilidad;
}

export type ResultadoPeriodo = ResultadoCreacion | ResultadoDuplicado;

@Injectable()
export class ResponsabilidadesService {
  private readonly logger = new Logger(ResponsabilidadesService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore() {
    return this.firebaseService.getFirestore();
  }

  // ─── Períodos ────────────────────────────────────────────────────────────────

  async findAllPeriodos(): Promise<PeriodoResponsabilidad[]> {
    const snapshot = await this.firestore
      .collection('periodos_responsabilidad')
      .get();
    return snapshot.docs.map(
      (doc: any) => ({ id: doc.id, ...doc.data() } as PeriodoResponsabilidad),
    );
  }

  async findActivos(): Promise<PeriodoResponsabilidad[]> {
    const todos = await this.findAllPeriodos();
    return todos.filter((p) => !p.fechaFin);
  }

  async findHistorialByArea(area: string): Promise<PeriodoResponsabilidad[]> {
    const todos = await this.findAllPeriodos();
    return todos
      .filter((p) => p.area === area)
      .sort((a, b) => (a.fechaInicio < b.fechaInicio ? 1 : -1));
  }

  async crearPeriodo(
    dto: CreatePeriodoDto,
    asignadoPorNombre: string,
  ): Promise<ResultadoPeriodo> {
    // Validar duplicidad: mismo área + personalId con período activo (sin fechaFin)
    const activos = await this.findActivos();
    const duplicado = activos.find(
      (p) => p.area === dto.area && p.personalId === dto.personalId,
    );

    if (duplicado) {
      return {
        ok: false,
        razon: 'duplicado',
        periodoExistente: duplicado,
      };
    }

    const now = new Date().toISOString();
    const nuevoPeriodo: Omit<PeriodoResponsabilidad, 'id'> = {
      nivel: dto.nivel as PeriodoResponsabilidad['nivel'],
      area: dto.area,
      caja: dto.caja,
      personalId: dto.personalId,
      personalNombre: dto.personalNombre,
      tipo: dto.tipo as PeriodoResponsabilidad['tipo'],
      permisos: dto.permisos as PermisoResponsabilidad[],
      fechaInicio: dto.fechaInicio,
      asignadoPor: asignadoPorNombre,
      notificacionEnviada: false,
      observacion: dto.observacion,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firestore
      .collection('periodos_responsabilidad')
      .add(nuevoPeriodo);

    const periodo: PeriodoResponsabilidad = {
      id: docRef.id,
      ...nuevoPeriodo,
    };

    return { ok: true, periodo };
  }

  async cerrarPeriodo(id: string): Promise<PeriodoResponsabilidad> {
    const doc = await this.firestore
      .collection('periodos_responsabilidad')
      .doc(id)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(
        `Período de responsabilidad con ID ${id} no encontrado`,
      );
    }

    const hoy = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    await this.firestore
      .collection('periodos_responsabilidad')
      .doc(id)
      .update({ fechaFin: hoy, updatedAt: now });

    return {
      id,
      ...doc.data(),
      fechaFin: hoy,
      updatedAt: now,
    } as PeriodoResponsabilidad;
  }

  async reasignar(
    idAnterior: string,
    dto: CreatePeriodoDto,
    asignadoPorNombre: string,
  ): Promise<{ periodoAnterior: PeriodoResponsabilidad; resultado: ResultadoPeriodo }> {
    const periodoAnterior = await this.cerrarPeriodo(idAnterior);
    const resultado = await this.crearPeriodo(dto, asignadoPorNombre);
    return { periodoAnterior, resultado };
  }

  // ─── Personal ────────────────────────────────────────────────────────────────

  async findAllPersonal(): Promise<PersonalTaller[]> {
    const snapshot = await this.firestore.collection('personal_taller').get();
    return snapshot.docs.map(
      (doc: any) => ({ id: doc.id, ...doc.data() } as PersonalTaller),
    );
  }

  async findPersonalActivo(): Promise<PersonalTaller[]> {
    const todos = await this.findAllPersonal();
    return todos.filter((p) => p.activo === true);
  }

  async crearPersonal(dto: CreatePersonalDto): Promise<PersonalTaller> {
    const now = new Date().toISOString();
    const nuevoPersonal: Omit<PersonalTaller, 'id'> = {
      nombre: dto.nombre,
      cargo: dto.cargo,
      area: dto.area,
      activo: dto.activo !== undefined ? dto.activo : true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firestore
      .collection('personal_taller')
      .add(nuevoPersonal);

    return { id: docRef.id, ...nuevoPersonal };
  }

  // ─── Seed ────────────────────────────────────────────────────────────────────

  async seedData(): Promise<{ personal: number; periodos: number; mensaje: string }> {
    // Verificar si ya existen datos (idempotente)
    const personalExistente = await this.findAllPersonal();
    const periodosExistentes = await this.findAllPeriodos();

    if (personalExistente.length > 0 || periodosExistentes.length > 0) {
      return {
        personal: personalExistente.length,
        periodos: periodosExistentes.length,
        mensaje: 'Los datos ya estaban cargados. No se insertó nada.',
      };
    }

    const now = new Date().toISOString();

    // ── Personal ──────────────────────────────────────────────────────────────
    const personalSeed: Array<Omit<PersonalTaller, 'id'>> = [
      {
        nombre: 'Carlos Mendoza',
        cargo: 'Técnico Líder',
        area: 'Taller',
        activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: 'Pedro Alvarado',
        cargo: 'Personal de Taller',
        area: 'Taller',
        activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: 'Juan Morales',
        cargo: 'Personal de Taller',
        area: 'Taller',
        activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: 'Miguel Sánchez',
        cargo: 'Técnico Alineación',
        area: 'Taller',
        activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: 'Roberto Gómez',
        cargo: 'Técnico EV',
        area: 'EV',
        activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: 'Luis Pérez',
        cargo: 'Bodeguero',
        area: 'Bodega',
        activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: 'Ana Torres',
        cargo: 'Asesora Recepción',
        area: 'Recepción',
        activo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        nombre: 'Marco Villacís',
        cargo: 'Técnico Junior',
        area: 'Taller',
        activo: false,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const ids: Record<string, string> = {};
    const personalIds = ['PT-001', 'PT-002', 'PT-003', 'PT-004', 'PT-005', 'PT-006', 'PT-007', 'PT-008'];

    for (let i = 0; i < personalSeed.length; i++) {
      const id = personalIds[i];
      await this.firestore
        .collection('personal_taller')
        .doc(id)
        .set(personalSeed[i]);
      ids[personalSeed[i].nombre] = id;
    }

    // ── Períodos ──────────────────────────────────────────────────────────────
    const todosPermisos: PermisoResponsabilidad[] = [
      'gestionar_prestamos',
      'aprobar_devoluciones',
      'registrar_fallas',
      'gestionar_epp',
      'ver_reportes',
    ];

    const periodosSeed: Array<{ id: string; data: Omit<PeriodoResponsabilidad, 'id'> }> = [
      {
        id: 'RESP-001',
        data: {
          nivel: 'area',
          area: 'Taller',
          personalId: 'PT-001',
          personalNombre: 'Carlos Mendoza',
          tipo: 'titular',
          permisos: todosPermisos,
          fechaInicio: '2025-01-10',
          asignadoPor: 'Jefe de Taller',
          notificacionEnviada: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        id: 'RESP-002',
        data: {
          nivel: 'area',
          area: 'Bodega',
          personalId: 'PT-006',
          personalNombre: 'Luis Pérez',
          tipo: 'titular',
          permisos: ['gestionar_prestamos', 'ver_reportes'],
          fechaInicio: '2025-01-10',
          asignadoPor: 'Jefe de Taller',
          notificacionEnviada: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        id: 'RESP-003',
        data: {
          nivel: 'area',
          area: 'EV',
          personalId: 'PT-005',
          personalNombre: 'Roberto Gómez',
          tipo: 'titular',
          permisos: todosPermisos,
          fechaInicio: '2025-02-01',
          asignadoPor: 'Jefe de Taller',
          notificacionEnviada: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        id: 'RESP-000',
        data: {
          nivel: 'area',
          area: 'Taller',
          personalId: 'PT-008',
          personalNombre: 'Marco Villacís',
          tipo: 'titular',
          permisos: todosPermisos,
          fechaInicio: '2024-07-01',
          fechaFin: '2025-01-09',
          asignadoPor: 'Jefe de Taller',
          notificacionEnviada: true,
          createdAt: now,
          updatedAt: now,
        },
      },
    ];

    for (const { id, data } of periodosSeed) {
      await this.firestore
        .collection('periodos_responsabilidad')
        .doc(id)
        .set(data);
    }

    return {
      personal: personalSeed.length,
      periodos: periodosSeed.length,
      mensaje: `Seed completado: ${personalSeed.length} personal y ${periodosSeed.length} períodos insertados.`,
    };
  }
}
