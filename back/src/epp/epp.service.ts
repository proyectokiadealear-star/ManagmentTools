import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { CatalogoEPP, EntregaEPP, ComparativaEPP } from './entities/epp.entity';
import { CreateCatalogoEPPDto, UpdateCatalogoEPPDto, RegistrarEntregaDto } from './dto/epp.dto';
import { UsuariosService } from '../usuarios/usuarios.service';

@Injectable()
export class EppService {
  private readonly logger = new Logger(EppService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usuariosService: UsuariosService,
  ) {}

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  CATÁLOGO EPP
  // ═══════════════════════════════════════════════════════════════════════════════

  async findAllCatalogo(): Promise<CatalogoEPP[]> {
    const snapshot = await this.firestore.collection('catalogo_epp').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CatalogoEPP));
  }

  async findOneCatalogo(id: string): Promise<CatalogoEPP> {
    const doc = await this.firestore.collection('catalogo_epp').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`EPP con ID ${id} no encontrado en catálogo`);
    }
    return { id: doc.id, ...doc.data() } as CatalogoEPP;
  }

  async createCatalogoEPP(dto: CreateCatalogoEPPDto): Promise<CatalogoEPP> {
    const data: Omit<CatalogoEPP, 'id'> = { ...dto };
    const docRef = await this.firestore.collection('catalogo_epp').add(data);
    return { id: docRef.id, ...data };
  }

  async updateCatalogoEPP(id: string, dto: UpdateCatalogoEPPDto): Promise<CatalogoEPP> {
    const existente = await this.findOneCatalogo(id);
    const actualizado: CatalogoEPP = { ...existente, ...dto };
    await this.firestore.collection('catalogo_epp').doc(id).update(dto as any);
    return actualizado;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  ENTREGAS
  // ═══════════════════════════════════════════════════════════════════════════════

  async registrarEntrega(dto: RegistrarEntregaDto): Promise<EntregaEPP> {
    const usuario = await this.usuariosService.findAssignableById(dto.tecnicoId).catch(() => null);
    if (!usuario) {
      throw new BadRequestException('Usuario no elegible para asignación de insumos/EPP');
    }

    const epp = await this.findOneCatalogo(dto.eppId);

    // If extraordinary, require a reason
    if (dto.esExtraordinaria && !dto.motivoExtraordinaria) {
      throw new BadRequestException(
        'Las entregas extraordinarias requieren un motivo (motivoExtraordinaria).',
      );
    }

    // Check if last delivery was too recent (suspicious extraordinary)
    if (dto.esExtraordinaria) {
      const recentSnapshot = await this.firestore
        .collection('entregas_epp')
        .where('tecnicoId', '==', dto.tecnicoId)
        .where('eppId', '==', dto.eppId)
        .orderBy('fechaEntrega', 'desc')
        .limit(1)
        .get();

      if (!recentSnapshot.empty) {
        const ultimaEntrega = recentSnapshot.docs[0].data() as Omit<EntregaEPP, 'id'>;
        const diasDesdeUltima = Math.floor(
          (Date.now() - new Date(ultimaEntrega.fechaEntrega).getTime()) / (1000 * 60 * 60 * 24),
        );
        const umbralSospechoso = Math.floor(epp.frecuenciaReposicionDias * 0.25);
        if (diasDesdeUltima < umbralSospechoso) {
          this.logger.warn(
            `Entrega extraordinaria sospechosa: técnico ${dto.tecnicoNombre} solicitó ${epp.nombre} ` +
            `hace solo ${diasDesdeUltima} días (umbral: ${umbralSospechoso} días).`,
          );
        }
      }
    }

    const fechaEntrega = new Date().toISOString();
    const proximaReposicion = new Date(
      Date.now() + epp.frecuenciaReposicionDias * 24 * 60 * 60 * 1000,
    ).toISOString();

    const entrega: Omit<EntregaEPP, 'id'> = {
      eppId: dto.eppId,
      eppNombre: epp.nombre,
      eppTipo: epp.tipo,
      tecnicoId: dto.tecnicoId,
      tecnicoNombre: usuario.nombre,
      areaId: dto.areaId,
      cantidad: dto.cantidad,
      loteProveedor: dto.loteProveedor,
      fechaEntrega,
      proximaReposicion,
      esExtraordinaria: dto.esExtraordinaria,
      motivoExtraordinaria: dto.motivoExtraordinaria,
      firmaDigitalTecnico: true,
      entregadoPor: dto.entregadoPor,
      entregadoPorNombre: dto.entregadoPorNombre,
    };

    const docRef = await this.firestore.collection('entregas_epp').add(entrega);

    // Descontar stock si existe
    if (epp.stockActual !== undefined && epp.stockActual !== null) {
      const nuevoStock = Math.max(0, epp.stockActual - dto.cantidad);
      await this.firestore.collection('catalogo_epp').doc(dto.eppId).update({ stockActual: nuevoStock });
    }

    return { id: docRef.id, ...entrega };
  }

  async findAllEntregas(tecnicoId?: string, areaId?: string, eppTipo?: string): Promise<EntregaEPP[]> {
    let query: FirebaseFirestore.Query = this.firestore.collection('entregas_epp');

    if (tecnicoId) {
      query = query.where('tecnicoId', '==', tecnicoId);
    }
    if (areaId) {
      query = query.where('areaId', '==', areaId);
    }
    if (eppTipo) {
      query = query.where('eppTipo', '==', eppTipo);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EntregaEPP));
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  ENTREGAS PENDIENTES (próxima reposición <= hoy + 7 días)
  // ═══════════════════════════════════════════════════════════════════════════════

  async getEntregasPendientes(): Promise<EntregaEPP[]> {
    const limite = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const snapshot = await this.firestore
      .collection('entregas_epp')
      .where('proximaReposicion', '<=', limite)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EntregaEPP));
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  CALENDARIO SEMANAL (entregas que vencen esta semana, agrupadas por técnico)
  // ═══════════════════════════════════════════════════════════════════════════════

  async getCalendarioSemanal(): Promise<Record<string, { tecnicoNombre: string; entregas: EntregaEPP[] }>> {
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // domingo
    inicioSemana.setHours(0, 0, 0, 0);

    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 7);

    const snapshot = await this.firestore
      .collection('entregas_epp')
      .where('proximaReposicion', '>=', inicioSemana.toISOString())
      .where('proximaReposicion', '<=', finSemana.toISOString())
      .get();

    const entregas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EntregaEPP));

    const agrupado: Record<string, { tecnicoNombre: string; entregas: EntregaEPP[] }> = {};

    for (const e of entregas) {
      if (!agrupado[e.tecnicoId]) {
        agrupado[e.tecnicoId] = { tecnicoNombre: e.tecnicoNombre, entregas: [] };
      }
      agrupado[e.tecnicoId].entregas.push(e);
    }

    return agrupado;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  HISTORIAL POR TÉCNICO
  // ═══════════════════════════════════════════════════════════════════════════════

  async getHistorialTecnico(tecnicoId: string): Promise<EntregaEPP[]> {
    const snapshot = await this.firestore
      .collection('entregas_epp')
      .where('tecnicoId', '==', tecnicoId)
      .get();

    const entregas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EntregaEPP));
    // Sort by date descending
    entregas.sort((a, b) => new Date(b.fechaEntrega).getTime() - new Date(a.fechaEntrega).getTime());
    return entregas;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  COMPARATIVA DE CONSUMO EPP
  // ═══════════════════════════════════════════════════════════════════════════════

  async getComparativa(areaId?: string, periodo?: string): Promise<ComparativaEPP[]> {
    let entregas: EntregaEPP[];
    const snapshot = await this.firestore.collection('entregas_epp').get();
    entregas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EntregaEPP));

    // Apply filters
    if (areaId) {
      entregas = entregas.filter(e => e.areaId === areaId);
    }
    if (periodo) {
      entregas = entregas.filter(e => e.fechaEntrega.startsWith(periodo));
    }

    // Load catalog for cost and frequency lookup
    const catalogo = await this.findAllCatalogo();
    const catalogoMap = new Map<string, CatalogoEPP>();
    for (const c of catalogo) {
      catalogoMap.set(c.id, c);
    }

    // Determine period span in days
    let diasPeriodo = 90; // default: last 3 months
    if (periodo) {
      // If periodo is YYYY-MM, use days in that month
      const [year, month] = periodo.split('-').map(Number);
      if (year && month) {
        diasPeriodo = new Date(year, month, 0).getDate();
      }
    }

    // Group by technician
    const porTecnico = new Map<string, { nombre: string; areaId: string; entregas: EntregaEPP[] }>();
    for (const e of entregas) {
      if (!porTecnico.has(e.tecnicoId)) {
        porTecnico.set(e.tecnicoId, { nombre: e.tecnicoNombre, areaId: e.areaId, entregas: [] });
      }
      porTecnico.get(e.tecnicoId)!.entregas.push(e);
    }

    const comparativas: ComparativaEPP[] = [];

    for (const [tecnicoId, data] of porTecnico.entries()) {
      const consumoReal = data.entregas.reduce((sum, e) => sum + e.cantidad, 0);

      // Expected: for each EPP type, (diasPeriodo / frecuenciaReposicionDias) deliveries
      let consumoEsperado = 0;
      let costoAdicionalTotal = 0;

      // Group technician's deliveries by EPP
      const porEpp = new Map<string, EntregaEPP[]>();
      for (const e of data.entregas) {
        const lista = porEpp.get(e.eppId) || [];
        lista.push(e);
        porEpp.set(e.eppId, lista);
      }

      for (const [eppId, eppEntregas] of porEpp.entries()) {
        const cat = catalogoMap.get(eppId);
        if (!cat) continue;

        const esperado = Math.ceil(diasPeriodo / cat.frecuenciaReposicionDias);
        const real = eppEntregas.reduce((sum, e) => sum + e.cantidad, 0);
        consumoEsperado += esperado;

        if (real > esperado) {
          costoAdicionalTotal += (real - esperado) * cat.costoUnitario;
        }
      }

      const indice = consumoEsperado > 0
        ? parseFloat((consumoReal / consumoEsperado).toFixed(2))
        : 0;

      comparativas.push({
        tecnicoId,
        tecnicoNombre: data.nombre,
        areaId: data.areaId,
        consumoReal,
        consumoEsperado,
        indice,
        costoAdicional: parseFloat(costoAdicionalTotal.toFixed(2)),
        alerta: indice > 1.3,
      });
    }

    // Sort: alerts first, then by indice descending
    comparativas.sort((a, b) => {
      if (a.alerta !== b.alerta) return a.alerta ? -1 : 1;
      return b.indice - a.indice;
    });

    return comparativas;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  SEED DATA
  // ═══════════════════════════════════════════════════════════════════════════════

  async seedData(): Promise<{ catalogo: number; entregas: number; mensaje: string }> {
    const existentes = await this.firestore.collection('catalogo_epp').get();
    if (!existentes.empty) {
      this.logger.log(`Seed EPP omitido: ya existen ${existentes.size} EPPs en catálogo.`);
      return {
        catalogo: existentes.size,
        entregas: 0,
        mensaje: 'El catálogo de EPP ya tiene datos. No se insertó nada.',
      };
    }

    // ─── Catálogo seed ────────────────────────────────────────────────────
    const catalogoSeed: Array<{ id: string; data: Omit<CatalogoEPP, 'id'> }> = [
      {
        id: 'EPP-001',
        data: {
          nombre: 'Guantes de nitrilo talla M',
          tipo: 'guantes-nitrilo',
          frecuenciaReposicionDias: 30,
          costoUnitario: 15.50,
          stockActual: 200,
        },
      },
      {
        id: 'EPP-002',
        data: {
          nombre: 'Mascarilla N95 3M',
          tipo: 'mascarilla-n95',
          frecuenciaReposicionDias: 15,
          costoUnitario: 8.75,
          stockActual: 300,
        },
      },
      {
        id: 'EPP-003',
        data: {
          nombre: 'Gafas de seguridad anti-impacto',
          tipo: 'gafas-seguridad',
          frecuenciaReposicionDias: 180,
          costoUnitario: 45.00,
          stockActual: 50,
        },
      },
      {
        id: 'EPP-004',
        data: {
          nombre: 'Botas de seguridad punta de acero',
          tipo: 'botas-seguridad',
          frecuenciaReposicionDias: 365,
          costoUnitario: 120.00,
          stockActual: 30,
        },
      },
    ];

    for (const { id, data } of catalogoSeed) {
      await this.firestore.collection('catalogo_epp').doc(id).set(data);
    }

    // ─── Entregas seed ────────────────────────────────────────────────────
    const entregasSeed: Array<Omit<EntregaEPP, 'id'>> = [
      {
        eppId: 'EPP-001', eppNombre: 'Guantes de nitrilo talla M', eppTipo: 'guantes-nitrilo',
        tecnicoId: 'user-003', tecnicoNombre: 'Miguel Sánchez', areaId: 'area-taller',
        cantidad: 2, loteProveedor: 'LOTE-2025-GN01',
        fechaEntrega: '2025-03-01T08:00:00.000Z',
        proximaReposicion: '2025-03-31T08:00:00.000Z',
        esExtraordinaria: false, firmaDigitalTecnico: true,
        entregadoPor: 'user-001', entregadoPorNombre: 'Carlos Ramírez',
      },
      {
        eppId: 'EPP-002', eppNombre: 'Mascarilla N95 3M', eppTipo: 'mascarilla-n95',
        tecnicoId: 'user-003', tecnicoNombre: 'Miguel Sánchez', areaId: 'area-taller',
        cantidad: 5, loteProveedor: 'LOTE-2025-MN01',
        fechaEntrega: '2025-03-01T08:10:00.000Z',
        proximaReposicion: '2025-03-16T08:10:00.000Z',
        esExtraordinaria: false, firmaDigitalTecnico: true,
        entregadoPor: 'user-001', entregadoPorNombre: 'Carlos Ramírez',
      },
      {
        eppId: 'EPP-001', eppNombre: 'Guantes de nitrilo talla M', eppTipo: 'guantes-nitrilo',
        tecnicoId: 'user-004', tecnicoNombre: 'Roberto Gómez', areaId: 'area-taller',
        cantidad: 2,
        fechaEntrega: '2025-03-02T09:00:00.000Z',
        proximaReposicion: '2025-04-01T09:00:00.000Z',
        esExtraordinaria: false, firmaDigitalTecnico: true,
        entregadoPor: 'user-001', entregadoPorNombre: 'Carlos Ramírez',
      },
      {
        eppId: 'EPP-001', eppNombre: 'Guantes de nitrilo talla M', eppTipo: 'guantes-nitrilo',
        tecnicoId: 'user-004', tecnicoNombre: 'Roberto Gómez', areaId: 'area-taller',
        cantidad: 3, loteProveedor: 'LOTE-2025-GN02',
        fechaEntrega: '2025-03-10T14:00:00.000Z',
        proximaReposicion: '2025-04-09T14:00:00.000Z',
        esExtraordinaria: true, motivoExtraordinaria: 'Guantes dañados por contacto con solvente',
        firmaDigitalTecnico: true,
        entregadoPor: 'user-001', entregadoPorNombre: 'Carlos Ramírez',
      },
      {
        eppId: 'EPP-003', eppNombre: 'Gafas de seguridad anti-impacto', eppTipo: 'gafas-seguridad',
        tecnicoId: 'user-003', tecnicoNombre: 'Miguel Sánchez', areaId: 'area-taller',
        cantidad: 1,
        fechaEntrega: '2025-01-15T08:00:00.000Z',
        proximaReposicion: '2025-07-14T08:00:00.000Z',
        esExtraordinaria: false, firmaDigitalTecnico: true,
        entregadoPor: 'user-001', entregadoPorNombre: 'Carlos Ramírez',
      },
      {
        eppId: 'EPP-004', eppNombre: 'Botas de seguridad punta de acero', eppTipo: 'botas-seguridad',
        tecnicoId: 'user-005', tecnicoNombre: 'Ana Torres', areaId: 'area-recepcion',
        cantidad: 1,
        fechaEntrega: '2025-02-01T10:00:00.000Z',
        proximaReposicion: '2026-02-01T10:00:00.000Z',
        esExtraordinaria: false, firmaDigitalTecnico: true,
        entregadoPor: 'user-001', entregadoPorNombre: 'Carlos Ramírez',
      },
    ];

    for (const data of entregasSeed) {
      await this.firestore.collection('entregas_epp').add(data);
    }

    this.logger.log(`Seed EPP completado: ${catalogoSeed.length} catálogo + ${entregasSeed.length} entregas.`);
    return {
      catalogo: catalogoSeed.length,
      entregas: entregasSeed.length,
      mensaje: `Seed completado: ${catalogoSeed.length} EPPs en catálogo + ${entregasSeed.length} registros de entrega.`,
    };
  }
}
