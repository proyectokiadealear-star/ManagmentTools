import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { Falla } from './entities/falla.entity';
import { CreateFallaDto } from './dto/falla.dto';
import { UpdateFallaDto } from './dto/falla.dto';

export interface MetricasFallas {
  totalFallas: number;
  porEstado: Record<string, number>;
  promedioTiempoRespuestaGerencia: number;
  promedioTiempoTotalParada: number;
  totalCostoFallas: number;
}

@Injectable()
export class FallasService {
  private readonly logger = new Logger(FallasService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  async findAll(estado?: string): Promise<Falla[]> {
    let query: FirebaseFirestore.Query = this.firestore.collection('fallas');
    if (estado) {
      query = query.where('estado', '==', estado);
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Falla));
  }

  async findOne(id: string): Promise<Falla> {
    const doc = await this.firestore.collection('fallas').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Falla con ID ${id} no encontrada`);
    }
    return { id: doc.id, ...doc.data() } as Falla;
  }

  async create(dto: CreateFallaDto): Promise<Falla> {
    const now = new Date().toISOString();
    const fallaData: Omit<Falla, 'id'> = {
      ...dto,
      estado: 'reportada',
      fechaReporte: now,
    };

    const docRef = await this.firestore.collection('fallas').add(fallaData);
    return { id: docRef.id, ...fallaData };
  }

  async update(id: string, dto: UpdateFallaDto): Promise<Falla> {
    const existente = await this.findOne(id);

    const updateData: Partial<Falla> = { ...dto };

    // Auto-set fechaCierre when estado changes to 'reparada'
    if (dto.estado === 'reparada' && existente.estado !== 'reparada') {
      updateData.fechaCierre = new Date().toISOString();
    }

    // Calculate tiempoRespuestaGerencia when decision is set
    if (dto.decision && !existente.decision && existente.fechaReporte) {
      const fechaReporte = new Date(existente.fechaReporte).getTime();
      const ahora = Date.now();
      updateData.tiempoRespuestaGerencia = Math.round((ahora - fechaReporte) / 60000); // minutes
    }

    await this.firestore.collection('fallas').doc(id).update(updateData);
    return { ...existente, ...updateData };
  }

  async getMetricas(): Promise<MetricasFallas> {
    const fallas = await this.findAll();

    const porEstado: Record<string, number> = {};
    let sumaTiempoRespuesta = 0;
    let countTiempoRespuesta = 0;
    let sumaTiempoParada = 0;
    let countTiempoParada = 0;
    let totalCosto = 0;

    for (const f of fallas) {
      porEstado[f.estado] = (porEstado[f.estado] || 0) + 1;

      if (f.tiempoRespuestaGerencia != null) {
        sumaTiempoRespuesta += f.tiempoRespuestaGerencia;
        countTiempoRespuesta++;
      }
      if (f.tiempoTotalParada != null) {
        sumaTiempoParada += f.tiempoTotalParada;
        countTiempoParada++;
      }
      if (f.costoFalla != null) {
        totalCosto += f.costoFalla;
      }
    }

    return {
      totalFallas: fallas.length,
      porEstado,
      promedioTiempoRespuestaGerencia:
        countTiempoRespuesta > 0 ? Math.round(sumaTiempoRespuesta / countTiempoRespuesta) : 0,
      promedioTiempoTotalParada:
        countTiempoParada > 0 ? Math.round(sumaTiempoParada / countTiempoParada) : 0,
      totalCostoFallas: totalCosto,
    };
  }

  async seedData(): Promise<{ fallas: number; mensaje: string }> {
    const existentes = await this.findAll();
    if (existentes.length > 0) {
      this.logger.log(`Seed omitido: ya existen ${existentes.length} fallas.`);
      return {
        fallas: existentes.length,
        mensaje: 'Ya existen fallas registradas. No se insertó nada.',
      };
    }

    const now = new Date().toISOString();
    const fechaAnterior = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

    const fallasSeed: Array<{ id: string; data: Omit<Falla, 'id'> }> = [
      {
        id: 'F001',
        data: {
          activoId: 'A005',
          activoNombre: 'Alineadora 3D HawkEye',
          descripcionSintomas: 'Sensor delantero con lecturas inconsistentes ±3mm',
          impactoOperativo: 'No se pueden realizar alineaciones — servicio detenido',
          reportadoPor: 'user-003',
          reportadoPorNombre: 'Miguel Sánchez',
          fechaDeteccion: '2025-02-05',
          fechaReporte: fechaAnterior,
          estado: 'reparada',
          decision: 'reparar_inmediato',
          tiempoRespuestaGerencia: 45,
          tiempoTotalParada: 480,
          costoFalla: 950,
          causaRaiz: 'Desgaste de sensor por vibración excesiva',
          reparadoPor: 'Carlos Mendoza',
          fechaReparacion: now,
          fechaCierre: now,
        },
      },
      {
        id: 'F002',
        data: {
          activoId: 'A001',
          activoNombre: 'Scanner Automotriz GDS',
          descripcionSintomas: 'No conecta con módulo de transmisión en Sportage 2024',
          impactoOperativo: 'Diagnóstico de transmisión no disponible para este modelo',
          reportadoPor: 'user-002',
          reportadoPorNombre: 'Ana Torres',
          fechaDeteccion: '2025-02-08',
          fechaReporte: now,
          estado: 'reportada',
        },
      },
    ];

    for (const { id, data } of fallasSeed) {
      await this.firestore.collection('fallas').doc(id).set(data);
    }

    this.logger.log(`Seed completado: ${fallasSeed.length} fallas insertadas.`);
    return {
      fallas: fallasSeed.length,
      mensaje: `Seed completado: ${fallasSeed.length} fallas insertadas.`,
    };
  }
}
