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
  fallasPorTipo: Record<string, number>;
  fallasCriticas: number;
}

@Injectable()
export class FallasService {
  private readonly logger = new Logger(FallasService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  /**
   * Genera código único de falla: FALLA-2024-089
   */
  private generarCodigoFalla(año: number, numeroSecuencial: number): string {
    const numeroFormateado = String(numeroSecuencial).padStart(3, '0');
    return `FALLA-${año}-${numeroFormateado}`;
  }

  /**
   * Obtiene el siguiente número de secuencia para el código de falla
   */
  private async getSiguienteNumeroSecuencial(): Promise<number> {
    const añoActual = new Date().getFullYear();
    const snapshot = await this.firestore.collection('fallas')
      .where('codigoFalla', '>=', `FALLA-${añoActual}-000`)
      .where('codigoFalla', '<=', `FALLA-${añoActual}-999`)
      .get();
    
    if (snapshot.empty) {
      return 1;
    }
    
    let maxNum = 0;
    for (const doc of snapshot.docs) {
      const codigo = doc.data()['codigoFalla'];
      if (codigo) {
        const match = codigo.match(/FALLA-\d{4}-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    return maxNum + 1;
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
    const now = new Date();
    const nowISO = now.toISOString();
    const añoActual = now.getFullYear();
    const siguienteNumero = await this.getSiguienteNumeroSecuencial();
    const codigoFalla = this.generarCodigoFalla(añoActual, siguienteNumero);

    // Calcular tiempo de detección a reporte (minutos)
    const fechaDeteccion = dto.fechaDeteccion && dto.horaDeteccion 
      ? new Date(`${dto.fechaDeteccion}T${dto.horaDeteccion}:00`)
      : new Date(dto.fechaDeteccion || nowISO);
    const tiempoDeteccionAReporte = Math.round((now.getTime() - fechaDeteccion.getTime()) / 60000);

    const fallaData: Omit<Falla, 'id'> = {
      ...dto,
      codigoFalla,
      estado: 'reportada',
      fechaReporte: nowISO,
      tiempoDeteccionAReporte: Math.max(0, tiempoDeteccionAReporte),
      origen: 'correctiva',
      urgencia: dto.urgencia ?? 'media',
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

    // Calculate tiempoReporteARespuestaGerencia when fechaRespuestaGerencia is set
    if (dto.fechaRespuestaGerencia && !existente.fechaRespuestaGerencia && existente.fechaReporte) {
      const fechaReporte = new Date(existente.fechaReporte).getTime();
      const fechaRespuesta = new Date(dto.fechaRespuestaGerencia).getTime();
      updateData.tiempoReporteARespuestaGerencia = Math.round((fechaRespuesta - fechaReporte) / 60000);
      
      // Verificar SLA: respuesta gerencia < 2 horas (120 minutos)
      updateData.slaCumple = updateData.tiempoReporteARespuestaGerencia <= 120;
    }

    // Calcular tiempo total de parada cuando se cierra
    if (dto.estado === 'reparada' && dto.fechaReparacion && existente.fechaDeteccion) {
      const fechaDeteccion = new Date(existente.fechaDeteccion).getTime();
      const fechaReparacion = new Date(dto.fechaReparacion).getTime();
      updateData.tiempoTotalParada = Math.round((fechaReparacion - fechaDeteccion) / 60000);
    }

    // Calcular costo total si hay repuestos y/o mano de obra
    if ((dto.costoRepuestos !== undefined || dto.costoManoObra !== undefined) && existente) {
      const repuestos = dto.costoRepuestos ?? existente.costoRepuestos ?? 0;
      const manoObra = dto.costoManoObra ?? existente.costoManoObra ?? 0;
      updateData.costoTotal = repuestos + manoObra;
      updateData.costoFalla = repuestos + manoObra;
    }

    // Calcular tiempo de reparación si hay fecha inicio y fecha reparación
    if (dto.fechaReparacion && dto.fechaInicioReparacion && !existente.tiempoReparacion) {
      const inicio = new Date(dto.fechaInicioReparacion).getTime();
      const fin = new Date(dto.fechaReparacion).getTime();
      updateData.tiempoReparacion = Math.round((fin - inicio) / 60000);
    }

    await this.firestore.collection('fallas').doc(id).update(updateData);
    return { ...existente, ...updateData };
  }

  async getMetricas(): Promise<MetricasFallas> {
    const fallas = await this.findAll();

    const porEstado: Record<string, number> = {};
    const fallasPorTipo: Record<string, number> = {};
    let sumaTiempoRespuesta = 0;
    let countTiempoRespuesta = 0;
    let sumaTiempoParada = 0;
    let countTiempoParada = 0;
    let totalCosto = 0;
    let fallasCriticas = 0;

    for (const f of fallas) {
      porEstado[f.estado] = (porEstado[f.estado] || 0) + 1;

      if (f.tipoFalla) {
        fallasPorTipo[f.tipoFalla] = (fallasPorTipo[f.tipoFalla] || 0) + 1;
      }

      if (f.urgencia === 'critica') {
        fallasCriticas++;
      }

      if (f.tiempoReporteARespuestaGerencia != null) {
        sumaTiempoRespuesta += f.tiempoReporteARespuestaGerencia;
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
      fallasPorTipo,
      fallasCriticas,
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
          urgencia: 'critica',
          reportadoPor: 'user-003',
          reportadoPorNombre: 'Miguel Sánchez',
          fechaDeteccion: '2025-02-05',
          fechaReporte: fechaAnterior,
          estado: 'reparada',
          decision: 'reparar_inmediato',
          tiempoReporteARespuestaGerencia: 45,
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
          urgencia: 'media',
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
