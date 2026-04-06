import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { CatalogoInsumo, ConsumoInsumo, AnalisisAnomalia, NivelAnomalia } from './entities/insumo.entity';
import { CreateCatalogoInsumoDto, UpdateCatalogoInsumoDto, RegistrarConsumoDto } from './dto/insumo.dto';

/** Tolerancia de desviación: 20 % */
const TOLERANCIA_DESVIACION = 0.2;

@Injectable()
export class InsumosService {
  private readonly logger = new Logger(InsumosService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  CATÁLOGO
  // ═══════════════════════════════════════════════════════════════════════════════

  async findAllCatalogo(): Promise<CatalogoInsumo[]> {
    const snapshot = await this.firestore.collection('catalogo_insumos').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CatalogoInsumo));
  }

  async findOneCatalogo(id: string): Promise<CatalogoInsumo> {
    const doc = await this.firestore.collection('catalogo_insumos').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Insumo con ID ${id} no encontrado en catálogo`);
    }
    return { id: doc.id, ...doc.data() } as CatalogoInsumo;
  }

  async createCatalogoInsumo(dto: CreateCatalogoInsumoDto): Promise<CatalogoInsumo> {
    const data: Omit<CatalogoInsumo, 'id'> = { ...dto };
    const docRef = await this.firestore.collection('catalogo_insumos').add(data);
    return { id: docRef.id, ...data };
  }

  async updateCatalogoInsumo(id: string, dto: UpdateCatalogoInsumoDto): Promise<CatalogoInsumo> {
    const existente = await this.findOneCatalogo(id);
    const actualizado: CatalogoInsumo = { ...existente, ...dto };
    await this.firestore.collection('catalogo_insumos').doc(id).update(dto as any);
    return actualizado;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  CONSUMOS
  // ═══════════════════════════════════════════════════════════════════════════════

  async registrarConsumo(dto: RegistrarConsumoDto): Promise<ConsumoInsumo> {
    const insumo = await this.findOneCatalogo(dto.insumoId);

    const cantidadEsperada = insumo.consumoPromedioPorOT;
    const desviacion = cantidadEsperada > 0
      ? (dto.cantidad - cantidadEsperada) / cantidadEsperada
      : 0;

    // Si la desviación supera la tolerancia, exigir justificación
    if (Math.abs(desviacion) > TOLERANCIA_DESVIACION && !dto.justificacion) {
      throw new BadRequestException(
        `La cantidad registrada (${dto.cantidad}) excede la tolerancia del ${TOLERANCIA_DESVIACION * 100}% ` +
        `respecto al promedio (${cantidadEsperada}). Desviación: ${(desviacion * 100).toFixed(1)}%. ` +
        `Se requiere justificación.`,
      );
    }

    const consumo: Omit<ConsumoInsumo, 'id'> = {
      ordenTrabajoId: dto.ordenTrabajoId,
      insumoId: dto.insumoId,
      insumoNombre: insumo.nombre,
      insumoCodigo: insumo.codigo,
      cantidad: dto.cantidad,
      unidadMedida: insumo.unidadMedida,
      costoUnitario: insumo.costoUnitario,
      costoTotal: dto.cantidad * insumo.costoUnitario,
      cantidadEsperada,
      desviacion: parseFloat(desviacion.toFixed(4)),
      justificacion: dto.justificacion,
      evidenciaUrl: dto.evidenciaUrl,
      tecnicoId: dto.tecnicoId,
      tecnicoNombre: dto.tecnicoNombre,
      areaId: dto.areaId,
      fechaRegistro: new Date().toISOString(),
    };

    const docRef = await this.firestore.collection('consumo_insumos').add(consumo);

    // Descontar stock si existe
    if (insumo.stockActual !== undefined && insumo.stockActual !== null) {
      const nuevoStock = Math.max(0, insumo.stockActual - dto.cantidad);
      await this.firestore.collection('catalogo_insumos').doc(dto.insumoId).update({ stockActual: nuevoStock });
    }

    return { id: docRef.id, ...consumo };
  }

  async findAllConsumos(otId?: string, tecnicoId?: string, areaId?: string): Promise<ConsumoInsumo[]> {
    let query: FirebaseFirestore.Query = this.firestore.collection('consumo_insumos');

    if (otId) {
      query = query.where('ordenTrabajoId', '==', otId);
    }
    if (tecnicoId) {
      query = query.where('tecnicoId', '==', tecnicoId);
    }
    if (areaId) {
      query = query.where('areaId', '==', areaId);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConsumoInsumo));
  }

  async getConsumosPorOT(otId: string): Promise<{ consumos: ConsumoInsumo[]; costoTotal: number }> {
    const consumos = await this.findAllConsumos(otId);
    const costoTotal = consumos.reduce((sum, c) => sum + c.costoTotal, 0);
    return { consumos, costoTotal: parseFloat(costoTotal.toFixed(2)) };
  }

  async getConsumosPorTecnico(tecnicoId: string): Promise<ConsumoInsumo[]> {
    return this.findAllConsumos(undefined, tecnicoId);
  }

  async getResumenPorArea(
    areaId: string,
    periodo?: string,
  ): Promise<{ area: string; costoTotal: number; totalRegistros: number; porInsumo: Record<string, { cantidad: number; costo: number }> }> {
    let consumos = await this.findAllConsumos(undefined, undefined, areaId);

    if (periodo) {
      consumos = consumos.filter(c => c.fechaRegistro.startsWith(periodo));
    }

    const porInsumo: Record<string, { cantidad: number; costo: number }> = {};
    let costoTotal = 0;

    for (const c of consumos) {
      const key = `${c.insumoId}_${c.insumoNombre}`;
      if (!porInsumo[key]) {
        porInsumo[key] = { cantidad: 0, costo: 0 };
      }
      porInsumo[key].cantidad += c.cantidad;
      porInsumo[key].costo += c.costoTotal;
      costoTotal += c.costoTotal;
    }

    return {
      area: areaId,
      costoTotal: parseFloat(costoTotal.toFixed(2)),
      totalRegistros: consumos.length,
      porInsumo,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  ANÁLISIS DE ANOMALÍAS
  // ═══════════════════════════════════════════════════════════════════════════════

  async analizarAnomalias(periodo?: string): Promise<AnalisisAnomalia[]> {
    let consumos: ConsumoInsumo[];
    const snapshot = await this.firestore.collection('consumo_insumos').get();
    consumos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConsumoInsumo));

    if (periodo) {
      consumos = consumos.filter(c => c.fechaRegistro.startsWith(periodo));
    }

    // Agrupar consumos por insumoId
    const porInsumo = new Map<string, ConsumoInsumo[]>();
    for (const c of consumos) {
      const lista = porInsumo.get(c.insumoId) || [];
      lista.push(c);
      porInsumo.set(c.insumoId, lista);
    }

    const anomalias: AnalisisAnomalia[] = [];

    for (const [insumoId, registros] of porInsumo.entries()) {
      if (registros.length < 2) continue; // need at least 2 records for analysis

      const cantidades = registros.map(r => r.cantidad);
      const mean = cantidades.reduce((s, v) => s + v, 0) / cantidades.length;
      const variance = cantidades.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / cantidades.length;
      const stddev = Math.sqrt(variance);

      const umbralAlerta = mean + 2 * stddev;
      const umbralCritico = mean + 3 * stddev;

      // Total real vs total esperado
      const consumoReal = cantidades.reduce((s, v) => s + v, 0);
      const consumoEsperado = registros.reduce((s, r) => s + r.cantidadEsperada, 0);
      const desviacionPct = consumoEsperado > 0
        ? ((consumoReal - consumoEsperado) / consumoEsperado) * 100
        : 0;

      // Detect OTs with anomalous consumption
      const otsSospechosas = registros
        .filter(r => r.cantidad > umbralAlerta)
        .map(r => ({ otId: r.ordenTrabajoId, cantidad: r.cantidad, tecnico: r.tecnicoNombre }));

      if (otsSospechosas.length === 0) continue;

      let nivel: NivelAnomalia = 'normal';
      if (registros.some(r => r.cantidad > umbralCritico)) {
        nivel = 'critico';
      } else if (otsSospechosas.length > 0) {
        nivel = 'alerta';
      }

      anomalias.push({
        insumoId,
        insumoNombre: registros[0].insumoNombre,
        periodo: periodo || 'todos',
        consumoReal: parseFloat(consumoReal.toFixed(2)),
        consumoEsperado: parseFloat(consumoEsperado.toFixed(2)),
        desviacionPorcentaje: parseFloat(desviacionPct.toFixed(2)),
        nivel,
        otsSospechosas,
      });
    }

    // Sort by severity: critico first, then alerta
    const orden: Record<NivelAnomalia, number> = { critico: 0, alerta: 1, normal: 2 };
    anomalias.sort((a, b) => orden[a.nivel] - orden[b.nivel]);

    return anomalias;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  SEED DATA
  // ═══════════════════════════════════════════════════════════════════════════════

  async seedData(): Promise<{ catalogo: number; consumos: number; mensaje: string }> {
    const existentes = await this.firestore.collection('catalogo_insumos').get();
    if (!existentes.empty) {
      this.logger.log(`Seed insumos omitido: ya existen ${existentes.size} insumos en catálogo.`);
      return {
        catalogo: existentes.size,
        consumos: 0,
        mensaje: 'El catálogo de insumos ya tiene datos. No se insertó nada.',
      };
    }

    // ─── Catálogo seed ────────────────────────────────────────────────────
    const catalogoSeed: Array<{ id: string; data: Omit<CatalogoInsumo, 'id'> }> = [
      {
        id: 'INS-001',
        data: {
          nombre: 'Pintura base bicapa KIA P5',
          tipo: 'pintura',
          codigo: 'INS-PIN-001',
          unidadMedida: 'litros',
          costoUnitario: 45.50,
          consumoPromedioPorOT: 2.5,
          stockActual: 120,
          stockMinimo: 20,
        },
      },
      {
        id: 'INS-002',
        data: {
          nombre: 'Barniz transparente automotriz',
          tipo: 'barniz',
          codigo: 'INS-BAR-001',
          unidadMedida: 'litros',
          costoUnitario: 38.00,
          consumoPromedioPorOT: 1.8,
          stockActual: 80,
          stockMinimo: 15,
        },
      },
      {
        id: 'INS-003',
        data: {
          nombre: 'Lija grano 800 Norton',
          tipo: 'lija',
          codigo: 'INS-LIJ-001',
          unidadMedida: 'unidades',
          costoUnitario: 2.50,
          consumoPromedioPorOT: 6,
          stockActual: 500,
          stockMinimo: 100,
        },
      },
      {
        id: 'INS-004',
        data: {
          nombre: 'Cinta masking 3M azul 48mm',
          tipo: 'masking',
          codigo: 'INS-MSK-001',
          unidadMedida: 'rollos',
          costoUnitario: 8.75,
          consumoPromedioPorOT: 3,
          stockActual: 200,
          stockMinimo: 40,
        },
      },
      {
        id: 'INS-005',
        data: {
          nombre: 'Aceite motor 5W-30 sintético',
          tipo: 'aceite',
          codigo: 'INS-ACE-001',
          unidadMedida: 'litros',
          costoUnitario: 12.00,
          consumoPromedioPorOT: 4.5,
          stockActual: 300,
          stockMinimo: 50,
        },
      },
    ];

    for (const { id, data } of catalogoSeed) {
      await this.firestore.collection('catalogo_insumos').doc(id).set(data);
    }

    // ─── Consumos seed ────────────────────────────────────────────────────
    const now = new Date().toISOString();
    const consumosSeed: Array<Omit<ConsumoInsumo, 'id'>> = [
      {
        ordenTrabajoId: 'OT-2025-0042',
        insumoId: 'INS-001', insumoNombre: 'Pintura base bicapa KIA P5', insumoCodigo: 'INS-PIN-001',
        cantidad: 2.3, unidadMedida: 'litros', costoUnitario: 45.50, costoTotal: 104.65,
        cantidadEsperada: 2.5, desviacion: -0.08,
        tecnicoId: 'user-003', tecnicoNombre: 'Miguel Sánchez', areaId: 'area-taller',
        fechaRegistro: '2025-03-15T09:30:00.000Z',
      },
      {
        ordenTrabajoId: 'OT-2025-0042',
        insumoId: 'INS-002', insumoNombre: 'Barniz transparente automotriz', insumoCodigo: 'INS-BAR-001',
        cantidad: 1.6, unidadMedida: 'litros', costoUnitario: 38.00, costoTotal: 60.80,
        cantidadEsperada: 1.8, desviacion: -0.1111,
        tecnicoId: 'user-003', tecnicoNombre: 'Miguel Sánchez', areaId: 'area-taller',
        fechaRegistro: '2025-03-15T10:15:00.000Z',
      },
      {
        ordenTrabajoId: 'OT-2025-0043',
        insumoId: 'INS-001', insumoNombre: 'Pintura base bicapa KIA P5', insumoCodigo: 'INS-PIN-001',
        cantidad: 4.8, unidadMedida: 'litros', costoUnitario: 45.50, costoTotal: 218.40,
        cantidadEsperada: 2.5, desviacion: 0.92,
        justificacion: 'Panel completo repintado por daño extenso',
        tecnicoId: 'user-004', tecnicoNombre: 'Roberto Gómez', areaId: 'area-taller',
        fechaRegistro: '2025-03-16T08:00:00.000Z',
      },
      {
        ordenTrabajoId: 'OT-2025-0043',
        insumoId: 'INS-003', insumoNombre: 'Lija grano 800 Norton', insumoCodigo: 'INS-LIJ-001',
        cantidad: 12, unidadMedida: 'unidades', costoUnitario: 2.50, costoTotal: 30.00,
        cantidadEsperada: 6, desviacion: 1.0,
        justificacion: 'Superficie irregular requirió lijado adicional',
        tecnicoId: 'user-004', tecnicoNombre: 'Roberto Gómez', areaId: 'area-taller',
        fechaRegistro: '2025-03-16T08:45:00.000Z',
      },
      {
        ordenTrabajoId: 'OT-2025-0044',
        insumoId: 'INS-005', insumoNombre: 'Aceite motor 5W-30 sintético', insumoCodigo: 'INS-ACE-001',
        cantidad: 4.2, unidadMedida: 'litros', costoUnitario: 12.00, costoTotal: 50.40,
        cantidadEsperada: 4.5, desviacion: -0.0667,
        tecnicoId: 'user-003', tecnicoNombre: 'Miguel Sánchez', areaId: 'area-taller',
        fechaRegistro: '2025-03-17T11:00:00.000Z',
      },
      {
        ordenTrabajoId: 'OT-2025-0045',
        insumoId: 'INS-004', insumoNombre: 'Cinta masking 3M azul 48mm', insumoCodigo: 'INS-MSK-001',
        cantidad: 3, unidadMedida: 'rollos', costoUnitario: 8.75, costoTotal: 26.25,
        cantidadEsperada: 3, desviacion: 0,
        tecnicoId: 'user-005', tecnicoNombre: 'Ana Torres', areaId: 'area-recepcion',
        fechaRegistro: '2025-03-18T14:00:00.000Z',
      },
      {
        ordenTrabajoId: 'OT-2025-0046',
        insumoId: 'INS-001', insumoNombre: 'Pintura base bicapa KIA P5', insumoCodigo: 'INS-PIN-001',
        cantidad: 5.5, unidadMedida: 'litros', costoUnitario: 45.50, costoTotal: 250.25,
        cantidadEsperada: 2.5, desviacion: 1.2,
        justificacion: 'Repintado completo lateral derecho',
        tecnicoId: 'user-004', tecnicoNombre: 'Roberto Gómez', areaId: 'area-taller',
        fechaRegistro: '2025-03-19T09:00:00.000Z',
      },
      {
        ordenTrabajoId: 'OT-2025-0047',
        insumoId: 'INS-005', insumoNombre: 'Aceite motor 5W-30 sintético', insumoCodigo: 'INS-ACE-001',
        cantidad: 8.0, unidadMedida: 'litros', costoUnitario: 12.00, costoTotal: 96.00,
        cantidadEsperada: 4.5, desviacion: 0.7778,
        justificacion: 'Motor requirió doble carga por fuga reparada',
        tecnicoId: 'user-003', tecnicoNombre: 'Miguel Sánchez', areaId: 'area-taller',
        fechaRegistro: '2025-03-20T10:30:00.000Z',
      },
    ];

    for (const data of consumosSeed) {
      await this.firestore.collection('consumo_insumos').add(data);
    }

    this.logger.log(`Seed insumos completado: ${catalogoSeed.length} catálogo + ${consumosSeed.length} consumos.`);
    return {
      catalogo: catalogoSeed.length,
      consumos: consumosSeed.length,
      mensaje: `Seed completado: ${catalogoSeed.length} insumos en catálogo + ${consumosSeed.length} registros de consumo.`,
    };
  }
}
