import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { Activo } from './entities/activo.entity';
import { CreateActivoDto } from './dto/create-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';
import { TransferirActivoDto } from './dto/transferir-activo.dto';
import { BuscarActivoDto } from './dto/buscar-activo.dto';
import { FiltrosActivoDto } from './dto/filtros-activo.dto';
import { Movimiento } from './entities/movimiento.entity';

export interface EstadisticasActivos {
  total: number;
  enCajasPersonales: number;
  enUbicacionesFijas: number;
  enPrestamo: number;
  enMantenimiento: number;
  danados: number;
  disponibles: number;
}

export interface DisponibilidadActivo {
  id: string;
  disponible: boolean;
  estadoOperativo: string;
  mensaje: string;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  async findAll(): Promise<Activo[]> {
    const snapshot = await this.firestore.collection('activos').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activo));
  }

  async findOne(id: string): Promise<Activo> {
    const doc = await this.firestore.collection('activos').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Activo con ID ${id} no encontrado`);
    }
    return { id: doc.id, ...doc.data() } as Activo;
  }

  async create(createActivoDto: CreateActivoDto, usuarioId: string): Promise<Activo> {
    const now = new Date().toISOString();
    const activo: Omit<Activo, 'id'> = {
      ...createActivoDto,
      estado: (createActivoDto.estado as Activo['estado']) || 'activo',
      estadoOperativo: 'disponible',
      createdAt: now,
      updatedAt: now,
      usuarioId,
    };

    // Firestore no acepta valores undefined — eliminarlos antes de escribir
    const cleanData = Object.fromEntries(
      Object.entries(activo).filter(([, v]) => v !== undefined),
    );

    const docRef = await this.firestore.collection('activos').add(cleanData);
    const activoCreado: Activo = { id: docRef.id, ...activo };

    // Si se indicó fecha del último mantenimiento, crear programación automáticamente
    if (createActivoDto.fechaUltimoMantenimiento) {
      await this.crearProgramacionMantenimiento(
        docRef.id,
        createActivoDto,
        usuarioId,
        now,
      );
    }

    return activoCreado;
  }

  private buildProgramacionData(
    activoId: string,
    fields: {
      nombre: string;
      periodicidad?: string;
      fechaUltimoMantenimiento: string;
      responsable?: string;
      custodio?: string;
    },
    creadoPor: string,
    now: string,
  ) {
    const periodicidadMap: Record<string, number> = {
      mensual: 30,
      trimestral: 90,
      semestral: 180,
      anual: 365,
    };
    const periodicidadDias =
      periodicidadMap[(fields.periodicidad ?? '').toLowerCase()] ?? 365;

    // Calcular próximo mantenimiento sumando la periodicidad al último
    const ultimoDate = new Date(fields.fechaUltimoMantenimiento);
    const proximoDate = new Date(ultimoDate);
    proximoDate.setDate(proximoDate.getDate() + periodicidadDias);
    const proximo = proximoDate.toISOString().split('T')[0];

    const diasRestantes = Math.ceil(
      (proximoDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const estado =
      diasRestantes <= 0 ? 'vencido' : diasRestantes <= 15 ? 'proximo' : 'vigente';

    return {
      activoId,
      activoNombre: fields.nombre,
      tipo: 'preventivo',
      periodicidadDias,
      ultimoMantenimiento: fields.fechaUltimoMantenimiento,
      proximoMantenimiento: proximo,
      responsableId: creadoPor,
      responsableNombre: fields.responsable ?? fields.custodio ?? '',
      estado,
      creadoPor,
      fechaCreacion: now,
    };
  }

  private async crearProgramacionMantenimiento(
    activoId: string,
    dto: CreateActivoDto,
    creadoPor: string,
    now: string,
  ): Promise<void> {
    const data = this.buildProgramacionData(
      activoId,
      {
        nombre: dto.nombre,
        periodicidad: dto.periodicidad,
        fechaUltimoMantenimiento: dto.fechaUltimoMantenimiento!,
        responsable: dto.responsable,
        custodio: dto.custodio,
      },
      creadoPor,
      now,
    );

    const cleanProg = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined && v !== ''),
    );

    await this.firestore.collection('programacion_mantenimiento').add(cleanProg);
    this.logger.log(`Programación de mantenimiento creada para activo ${activoId}`);
  }

  private async upsertProgramacionMantenimiento(
    activoId: string,
    fields: {
      nombre: string;
      periodicidad?: string;
      fechaUltimoMantenimiento: string;
      responsable?: string;
      custodio?: string;
    },
    creadoPor: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const data = this.buildProgramacionData(activoId, fields, creadoPor, now);

    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined && v !== ''),
    );

    // Buscar programación preventiva existente para este activo
    const existing = await this.firestore
      .collection('programacion_mantenimiento')
      .where('activoId', '==', activoId)
      .where('tipo', '==', 'preventivo')
      .limit(1)
      .get();

    if (!existing.empty) {
      const docId = existing.docs[0].id;
      // Preservar creadoPor y fechaCreacion originales
      const { creadoPor: _cp, fechaCreacion: _fc, ...updateFields } = cleanData;
      await this.firestore.collection('programacion_mantenimiento').doc(docId).update(updateFields);
      this.logger.log(`Programación de mantenimiento actualizada para activo ${activoId}`);
    } else {
      await this.firestore.collection('programacion_mantenimiento').add(cleanData);
      this.logger.log(`Programación de mantenimiento creada para activo ${activoId}`);
    }
  }

  async update(id: string, updateActivoDto: UpdateActivoDto): Promise<Activo> {
    const existente = await this.findOne(id);
    const actualizado: Activo = {
      ...existente,
      ...updateActivoDto,
      estado: (updateActivoDto.estado || existente.estado) as Activo['estado'],
      estadoOperativo: (updateActivoDto.estadoOperativo || existente.estadoOperativo) as Activo['estadoOperativo'],
      updatedAt: new Date().toISOString(),
    };

    const cleanUpdate = Object.fromEntries(
      Object.entries(actualizado).filter(([, v]) => v !== undefined),
    );

    await this.firestore.collection('activos').doc(id).update(cleanUpdate);

    // Upsert programacion si se actualizó la fecha del último mantenimiento
    if (updateActivoDto.fechaUltimoMantenimiento) {
      await this.upsertProgramacionMantenimiento(id, {
        nombre: updateActivoDto.nombre ?? existente.nombre,
        periodicidad: updateActivoDto.periodicidad ?? existente.periodicidad,
        fechaUltimoMantenimiento: updateActivoDto.fechaUltimoMantenimiento,
        responsable: updateActivoDto.responsable ?? existente.responsable,
        custodio: updateActivoDto.custodio ?? existente.custodio,
      }, existente.usuarioId ?? 'sistema');
    }

    return actualizado;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.firestore.collection('activos').doc(id).delete();
  }

  async transferir(
    id: string,
    transferirDto: TransferirActivoDto,
    usuarioId: string,
    usuarioNombre?: string,
  ): Promise<Activo> {
    const existente = await this.findOne(id);

    const movimiento: Omit<Movimiento, 'id'> = {
      activoId: id,
      activoNombre: existente.nombre,
      desde: {
        areaId: existente.areaId,
        bahiaId: existente.bahiaId,
        rackId: existente.rackId,
      },
      hasta: {
        areaId: transferirDto.areaId,
        bahiaId: transferirDto.bahiaId,
        rackId: transferirDto.rackId,
        cajaId: transferirDto.cajaId,
      },
      motivo: transferirDto.motivo,
      usuarioId,
      usuarioNombre,
      fecha: new Date().toISOString(),
      tipo: 'transferencia',
    };

    await this.firestore.collection('movimientos').add(movimiento);

    return this.update(id, {
      areaId: transferirDto.areaId,
      bahiaId: transferirDto.bahiaId,
      rackId: transferirDto.rackId,
      cajaId: transferirDto.cajaId,
    });
  }

  async getMovimientos(activoId: string): Promise<Movimiento[]> {
    const snapshot = await this.firestore
      .collection('movimientos')
      .where('activoId', '==', activoId)
      .orderBy('fecha', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movimiento));
  }

  async validarUbicacionOcupada(areaId: string, bahiaId: string, rackId: string): Promise<boolean> {
    const snapshot = await this.firestore
      .collection('activos')
      .where('areaId', '==', areaId)
      .where('bahiaId', '==', bahiaId)
      .where('rackId', '==', rackId)
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  async getActivoEnUbicacion(areaId: string, bahiaId: string, rackId: string): Promise<Activo | null> {
    const snapshot = await this.firestore
      .collection('activos')
      .where('areaId', '==', areaId)
      .where('bahiaId', '==', bahiaId)
      .where('rackId', '==', rackId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Activo;
  }

  // ─── Catálogo visual: búsqueda por texto ────────────────────────────────────
  async search(buscarDto: BuscarActivoDto, filtrosDto: FiltrosActivoDto): Promise<Activo[]> {
    const todos = await this.findAll();
    let resultado = todos;

    // Búsqueda por texto libre (nombre, tipo, serial, placa, marca)
    if (buscarDto.q) {
      const q = buscarDto.q.toLowerCase();
      resultado = resultado.filter(a =>
        a.nombre?.toLowerCase().includes(q) ||
        a.tipo?.toLowerCase().includes(q) ||
        a.serial?.toLowerCase().includes(q) ||
        a.placa?.toLowerCase().includes(q) ||
        a.marca?.toLowerCase().includes(q) ||
        a.especificaciones?.toLowerCase().includes(q),
      );
    }

    // Filtro por tipo exacto
    if (filtrosDto.tipo) {
      resultado = resultado.filter(a =>
        a.tipo?.toLowerCase() === filtrosDto.tipo!.toLowerCase(),
      );
    }

    // Filtro por capacidad
    if (filtrosDto.capacidad) {
      resultado = resultado.filter(a =>
        a.capacidad?.toLowerCase().includes(filtrosDto.capacidad!.toLowerCase()),
      );
    }

    // Filtro por estado
    if (filtrosDto.estado) {
      resultado = resultado.filter(a => a.estado === filtrosDto.estado);
    }

    // Filtro por estadoOperativo
    if (filtrosDto.estadoOperativo) {
      resultado = resultado.filter(a => a.estadoOperativo === filtrosDto.estadoOperativo);
    }

    // Filtro por área
    if (filtrosDto.areaId) {
      resultado = resultado.filter(a => a.areaId === filtrosDto.areaId);
    }

    return resultado;
  }

  // ─── Dashboard: estadísticas globales ────────────────────────────────────────
  async getEstadisticas(): Promise<EstadisticasActivos> {
    const todos = await this.findAll();

    return {
      total: todos.length,
      enCajasPersonales: todos.filter(a => !!a.cajaId && !!a.custodio).length,
      enUbicacionesFijas: todos.filter(a => !a.cajaId).length,
      enPrestamo: todos.filter(a => a.estadoOperativo === 'en-prestamo').length,
      enMantenimiento: todos.filter(a => a.estadoOperativo === 'en-mantenimiento').length,
      danados: todos.filter(a => a.estadoOperativo === 'danado').length,
      disponibles: todos.filter(a => a.estadoOperativo === 'disponible').length,
    };
  }

  // ─── Seed de inventario ───────────────────────────────────────────────────────
  async seedData(): Promise<{ activos: number; mensaje: string }> {
    const existentes = await this.findAll();
    if (existentes.length > 0) {
      this.logger.log(`Seed omitido: ya existen ${existentes.length} activos.`);
      return {
        activos: existentes.length,
        mensaje: 'El inventario ya tiene datos. No se insertó nada.',
      };
    }

    const now = new Date().toISOString();

    // IDs de ubicación fijas (deben coincidir con el seed de locations)
    // Si locations aún no tiene seed, usamos referencias simbólicas
    const activosSeed: Array<{ id: string; data: Omit<Activo, 'id'> }> = [
      {
        id: 'A001',
        data: {
          nombre: 'Scanner Automotriz GDS',
          tipo: 'Equipo',
          marca: 'KIA',
          modelo: 'GDS Mobile',
          serial: 'GDS-2022-8472',
          placa: 'ACT-0045',
          proveedor: 'AEKIA S.A.',
          fechaCompra: '2022-10-28',
          valor: 2500.00,
          vidaUtil: 5,
          areaId: 'area-taller',
          bahiaId: 'bahia-diagnostico',
          rackId: 'rack-estacion-1',
          cajaId: 'caja-mesa-mendoza',
          responsable: 'Jefe de Taller',
          custodio: 'Carlos Mendoza',
          estado: 'activo',
          estadoOperativo: 'disponible',
          observacion: 'Requiere actualización anual',
          especificaciones: 'OBD2 / CAN BUS',
          imagenUrl: 'https://images.unsplash.com/photo-1635425896336-12158652614a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
          createdAt: now,
          updatedAt: now,
          usuarioId: 'seed',
        },
      },
      {
        id: 'A002',
        data: {
          nombre: 'Tablet Recepción de Vehículos',
          tipo: 'Tablet',
          marca: 'Samsung',
          modelo: 'Galaxy Tab Active3',
          serial: 'SM-T575-992',
          placa: 'ACT-0089',
          proveedor: 'Samsung Electronics',
          fechaCompra: '2023-03-15',
          valor: 450.00,
          vidaUtil: 3,
          areaId: 'area-recepcion',
          bahiaId: 'bahia-atencion-cliente',
          rackId: 'rack-modulo-3',
          cajaId: 'caja-escritorio-asesor-3',
          responsable: 'Jefe de Servicio',
          custodio: 'Ana Torres',
          estado: 'activo',
          estadoOperativo: 'disponible',
          observacion: 'Funda protectora desgastada',
          especificaciones: '64GB, Rugged',
          imagenUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
          createdAt: now,
          updatedAt: now,
          usuarioId: 'seed',
        },
      },
      {
        id: 'A003',
        data: {
          nombre: 'Torquímetro Digital 1/2"',
          tipo: 'Herramienta',
          marca: 'Snap-on',
          modelo: 'ATECH3FR250B',
          serial: 'SN-88372',
          placa: 'ACT-0102',
          proveedor: 'Snap-on Tools',
          fechaCompra: '2021-01-10',
          valor: 650.00,
          vidaUtil: 10,
          areaId: 'area-bodega',
          bahiaId: 'bahia-herramientas-especiales',
          rackId: 'rack-estante-b',
          cajaId: 'caja-estante-b2',
          responsable: 'Jefe de Repuestos',
          custodio: 'Luis Pérez',
          estado: 'en-reparacion',
          estadoOperativo: 'en-mantenimiento',
          observacion: 'Falla en display — enviado a calibración',
          especificaciones: '12.5-250 ft-lb',
          imagenUrl: 'https://images.unsplash.com/photo-1530825894095-9c184b068fcb?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
          createdAt: now,
          updatedAt: now,
          usuarioId: 'seed',
        },
      },
      {
        id: 'A004',
        data: {
          nombre: 'Conector EV Batería Alta Tensión',
          tipo: 'Conector',
          marca: 'KIA',
          modelo: 'EV6-CONN-01',
          serial: 'S/N',
          placa: 'S/P',
          proveedor: 'AEKIA S.A.',
          fechaCompra: '2023-11-05',
          valor: 120.00,
          vidaUtil: 2,
          areaId: 'area-bodega',
          bahiaId: 'bahia-vehiculos-electricos',
          rackId: 'rack-armario-ev1',
          cajaId: 'caja-ev1-slot-a',
          responsable: 'Jefe de Taller',
          custodio: 'Roberto Gómez',
          estado: 'activo',
          estadoOperativo: 'disponible',
          observacion: 'Uso exclusivo EV6',
          especificaciones: '800V',
          createdAt: now,
          updatedAt: now,
          usuarioId: 'seed',
        },
      },
      {
        id: 'A005',
        data: {
          nombre: 'Alineadora 3D',
          tipo: 'Equipo',
          marca: 'Hunter',
          modelo: 'HawkEye Elite',
          serial: 'HE-2020-554',
          placa: 'ACT-0012',
          proveedor: 'Equipos Automotrices Cia Ltda',
          fechaCompra: '2020-02-12',
          valor: 18500.00,
          vidaUtil: 8,
          areaId: 'area-taller',
          bahiaId: 'bahia-alineacion',
          rackId: 'rack-foso-1',
          cajaId: 'caja-foso1-plataforma',
          responsable: 'Jefe de Taller',
          custodio: 'Miguel Sánchez',
          estado: 'activo',
          estadoOperativo: 'disponible',
          observacion: 'Mantenimiento preventivo al día — Sensores calibrados',
          especificaciones: 'Vehículos livianos y pesados',
          capacidad: '3D multi-eje',
          createdAt: now,
          updatedAt: now,
          usuarioId: 'seed',
        },
      },
    ];

    for (const { id, data } of activosSeed) {
      await this.firestore.collection('activos').doc(id).set(data);
    }

    this.logger.log(`Seed completado: ${activosSeed.length} activos insertados.`);
    return {
      activos: activosSeed.length,
      mensaje: `Seed completado: ${activosSeed.length} activos insertados.`,
    };
  }

  // ─── Disponibilidad en tiempo real ───────────────────────────────────────────
  async getDisponibilidad(id: string): Promise<DisponibilidadActivo> {
    const activo = await this.findOne(id);
    const disponible = activo.estadoOperativo === 'disponible';

    const mensajes: Record<string, string> = {
      disponible: 'El activo está disponible para préstamo',
      'en-prestamo': 'El activo está actualmente en préstamo',
      'en-mantenimiento': 'El activo está en mantenimiento',
      danado: 'El activo está reportado como dañado',
    };

    return {
      id,
      disponible,
      estadoOperativo: activo.estadoOperativo,
      mensaje: mensajes[activo.estadoOperativo] ?? 'Estado desconocido',
    };
  }
}
