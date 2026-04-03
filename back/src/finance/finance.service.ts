import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { Activo } from '../assets/entities/activo.entity';
import {
  DepreciacionActivoDto,
  DepreciacionBulkResponseDto,
  RepararVsReemplazarResponseDto,
} from './dto/depreciacion-response.dto';
import { RepararVsReemplazarDto } from './dto/reparar-vs-reemplazar.dto';

@Injectable()
export class FinanceService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore() {
    return this.firebaseService.getFirestore();
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Parse purchase date in multiple formats:
   *   - ISO: '2022-10-28'
   *   - Legacy short: '28-oct-22'
   *   - Legacy long: '15-mar-2021'
   */
  private parseYearFromDate(fechaCompra: string): number {
    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(fechaCompra)) {
      return parseInt(fechaCompra.substring(0, 4), 10);
    }
    // Try dd-mmm-yy / dd-mmm-yyyy
    const parts = fechaCompra.split('-');
    if (parts.length === 3) {
      const yearStr = parts[2];
      const year = parseInt(yearStr.length === 2 ? `20${yearStr}` : yearStr, 10);
      if (!isNaN(year)) return year;
    }
    // Fallback: Date.parse
    const parsed = new Date(fechaCompra);
    if (!isNaN(parsed.getTime())) return parsed.getFullYear();
    return 2022;
  }

  private calcDepreciation(activo: Activo): DepreciacionActivoDto {
    const valor = activo.valor ?? 0;
    const vidaUtil = activo.vidaUtil ?? 5;
    const fechaCompra = activo.fechaCompra ?? '2022-01-01';

    const currentYear = new Date().getFullYear();
    const purchaseYear = this.parseYearFromDate(fechaCompra);
    const aniosTranscurridos = Math.max(0, currentYear - purchaseYear);
    const depreciacionAnual = vidaUtil > 0 ? valor / vidaUtil : 0;
    const depreciacionAcumulada = Math.min(valor, depreciacionAnual * aniosTranscurridos);
    const valorActual = Math.max(0, valor - depreciacionAcumulada);
    const porcentajeDepreciado = valor > 0 ? Math.round((depreciacionAcumulada / valor) * 100) : 0;

    return {
      activoId: activo.id,
      nombre: activo.nombre,
      valorOriginal: valor,
      vidaUtilAnios: vidaUtil,
      aniosTranscurridos,
      depreciacionAnual: Math.round(depreciacionAnual * 100) / 100,
      depreciacionAcumulada: Math.round(depreciacionAcumulada * 100) / 100,
      valorActual: Math.round(valorActual * 100) / 100,
      porcentajeDepreciado,
      fechaCompra,
    };
  }

  // ─── Public methods ────────────────────────────────────────────────────────

  async getDepreciacionByActivo(activoId: string): Promise<DepreciacionActivoDto> {
    const doc = await this.firestore.collection('activos').doc(activoId).get();
    if (!doc.exists) {
      throw new NotFoundException(`Activo con ID ${activoId} no encontrado`);
    }
    const activo = { id: doc.id, ...doc.data() } as Activo;
    return this.calcDepreciation(activo);
  }

  async getDepreciacionBulk(): Promise<DepreciacionBulkResponseDto> {
    const snapshot = await this.firestore.collection('activos').get();
    const activos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Activo));

    const depreciaciones = activos.map((a) => this.calcDepreciation(a));

    const totalValorOriginal = depreciaciones.reduce((s, d) => s + d.valorOriginal, 0);
    const totalValorActual = depreciaciones.reduce((s, d) => s + d.valorActual, 0);
    const totalDepreciacionAcumulada = depreciaciones.reduce((s, d) => s + d.depreciacionAcumulada, 0);

    return {
      activos: depreciaciones,
      totalValorOriginal: Math.round(totalValorOriginal * 100) / 100,
      totalValorActual: Math.round(totalValorActual * 100) / 100,
      totalDepreciacionAcumulada: Math.round(totalDepreciacionAcumulada * 100) / 100,
    };
  }

  async evaluarRepararVsReemplazar(
    dto: RepararVsReemplazarDto,
  ): Promise<RepararVsReemplazarResponseDto> {
    const doc = await this.firestore.collection('activos').doc(dto.activoId).get();
    if (!doc.exists) {
      throw new NotFoundException(`Activo con ID ${dto.activoId} no encontrado`);
    }
    const activo = { id: doc.id, ...doc.data() } as Activo;
    const dep = this.calcDepreciation(activo);

    const valorActual = dep.valorActual;
    const costoReparacion = dto.costoReparacion;
    const costoReemplazo = dto.costoReemplazo ?? dep.valorOriginal;

    // Porcentaje: costo reparación respecto al valor actual depreciado
    const porcentaje = valorActual > 0
      ? Math.round((costoReparacion / valorActual) * 100)
      : costoReparacion > 0 ? 999 : 0;

    let recomendacion: RepararVsReemplazarResponseDto['recomendacion'];
    let alertaNivel: RepararVsReemplazarResponseDto['alertaNivel'];
    let razon: string;

    if (porcentaje > 100) {
      recomendacion = 'reemplazar_definitivo';
      alertaNivel = 'rojo';
      razon = `Costo de reparación ($${costoReparacion}) supera el valor actual ($${valorActual}). Reemplazo definitivo recomendado.`;
    } else if (porcentaje > 50) {
      recomendacion = 'reemplazar';
      alertaNivel = 'rojo';
      razon = `Costo de reparación representa el ${porcentaje}% del valor actual. Se recomienda evaluar reemplazo.`;
    } else if (porcentaje > 30) {
      recomendacion = 'evaluar_reemplazo';
      alertaNivel = 'amarillo';
      razon = `Costo de reparación representa el ${porcentaje}% del valor actual. Evaluar costo-beneficio antes de autorizar.`;
    } else {
      recomendacion = 'reparar';
      alertaNivel = 'verde';
      razon = `Costo de reparación representa el ${porcentaje}% del valor actual. Reparación económicamente justificable.`;
    }

    return {
      activoId: activo.id,
      nombre: activo.nombre,
      valorActual,
      costoReparacion,
      costoReemplazo,
      porcentajeReparacionVsValor: porcentaje,
      recomendacion,
      alertaNivel,
      razon,
    };
  }

  async getActivosPorDepreciar(): Promise<DepreciacionActivoDto[]> {
    const bulk = await this.getDepreciacionBulk();
    return bulk.activos.filter((a) => a.porcentajeDepreciado >= 80);
  }
}
