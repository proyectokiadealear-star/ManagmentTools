import { Injectable } from '@nestjs/common';
import { AssetsService } from '../assets/assets.service';
import { FinanceService } from '../finance/finance.service';
import { MantenimientosService } from '../mantenimientos/mantenimientos.service';
import { FallasService } from '../fallas/fallas.service';
import { PrestamosService } from '../prestamos/prestamos.service';
import { Activo } from '../assets/entities/activo.entity';
import { Mantenimiento } from '../mantenimientos/entities/mantenimiento.entity';
import { ProgramacionConSemaforo } from '../mantenimientos/entities/programacion-mantenimiento.entity';
import { Falla } from '../fallas/entities/falla.entity';
import { Prestamo } from '../prestamos/entities/prestamo.entity';

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface DashboardActivosResponse {
  flota: {
    total: number;
    activos: number;
    enReparacion: number;
    dadosDeBaja: number;
    inactivos: number;
  };
  tco: {
    totalValorOriginalFlota: number;
    totalCostoMantenimientos: number;
    totalCostoFallas: number;
    tcoTotal: number;
    ranking: {
      activoId: string;
      nombre: string;
      valorOriginal: number;
      costoMantenimientos: number;
      costoFallas: number;
      tcoTotal: number;
    }[];
  };
  flotaDepreciada: {
    count: number;
    porcentajeDeFlota: number;
    activos: {
      activoId: string;
      nombre: string;
      porcentajeDepreciado: number;
      valorActual: number;
      valorOriginal: number;
      estado: string;
    }[];
  };
  disponibilidadPorArea: {
    area: string;
    cantidadFallas: number;
    totalParadaMinutos: number;
    totalParadaHoras: number;
  }[];
}

export interface DashboardMantenimientoResponse {
  ratioTipo: {
    preventivo: { count: number; costoTotal: number };
    correctivo: { count: number; costoTotal: number };
    calibracion: { count: number; costoTotal: number };
  };
  porcentajeCorrectivo: number;
  costoPromedioPorTipo: { preventivo: number; correctivo: number; calibracion: number };
  semaforos: { verde: number; amarillo: number; naranja: number; rojo: number };
  cumplimientoPorcentaje: number;
  top5MasCostosos: {
    activoId: string;
    activoNombre: string;
    cantidadMantenimientos: number;
    costoTotal: number;
  }[];
}

export interface DashboardFallasResponse {
  resumen: {
    total: number;
    porEstado: Record<string, number>;
    promedioParadaHoras: number;
    totalCostoFallas: number;
    promedioTiempoRespuestaGerenciaHoras: number;
  };
  ranking: {
    activoId: string;
    nombre: string;
    cantidadFallas: number;
    totalParadaHoras: number;
    totalCosto: number;
  }[];
  mtbf: {
    activoId: string;
    nombre: string;
    cantidadFallas: number;
    mtbfDias: number;
  }[];
  tiempoRespuestaGerencia: {
    promedioHoras: number;
    maxHoras: number;
    conteoSobreUmbral: number; // > 24 h
  };
}

export interface DashboardPrestamosResponse {
  resumen: {
    total: number;
    porEstado: Record<string, number>;
    totalDanosReportados: number;
    costoTotalDanos: number;
  };
  demandaHerramientas: {
    herramientaId: string;
    nombre: string;
    cantidadPrestamos: number;
    totalHorasEstimadas: number;
    porcentajeTiempoPrestado: number; // vs 30-day window (720 h)
  }[];
  tecnicosConDano: {
    tecnicoId: string;
    nombre: string;
    prestamosConDano: number;
    costoReparacionTotal: number;
    costoReposicionTotal: number;
    costoTotal: number;
  }[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class DashboardService {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly financeService: FinanceService,
    private readonly mantenimientosService: MantenimientosService,
    private readonly fallasService: FallasService,
    private readonly prestamosService: PrestamosService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/dashboard/activos
  // ─────────────────────────────────────────────────────────────────────────────

  async getDashboardActivos(): Promise<DashboardActivosResponse> {
    const [activos, mantenimientos, fallas, depreciacionBulk] = await Promise.all([
      this.assetsService.findAll(),
      this.mantenimientosService.findAllMantenimientos(),
      this.fallasService.findAll(),
      this.financeService.getDepreciacionBulk(),
    ]);

    // Flota por estado
    const flota = {
      total: activos.length,
      activos: activos.filter((a) => a.estado === 'activo').length,
      enReparacion: activos.filter((a) => a.estado === 'en-reparacion').length,
      dadosDeBaja: activos.filter((a) => a.estado === 'dado-de-baja').length,
      inactivos: activos.filter((a) => a.estado === 'inactivo').length,
    };

    // TCO: valor + suma costos mantenimiento + suma costos falla por activo
    const costoMantMap: Record<string, number> = {};
    for (const m of mantenimientos) {
      costoMantMap[m.activoId] = (costoMantMap[m.activoId] ?? 0) + (m.costoFinal ?? 0);
    }

    const costoFallaMap: Record<string, number> = {};
    for (const f of fallas) {
      costoFallaMap[f.activoId] = (costoFallaMap[f.activoId] ?? 0) + (f.costoFalla ?? 0);
    }

    const activoNombreMap: Record<string, string> = {};
    const activoValorMap: Record<string, number> = {};
    for (const a of activos) {
      activoNombreMap[a.id] = a.nombre;
      activoValorMap[a.id] = a.valor ?? 0;
    }

    const tcoRanking = activos
      .map((a) => {
        const costoMant = costoMantMap[a.id] ?? 0;
        const costoFulla = costoFallaMap[a.id] ?? 0;
        return {
          activoId: a.id,
          nombre: a.nombre,
          valorOriginal: a.valor ?? 0,
          costoMantenimientos: costoMant,
          costoFallas: costoFulla,
          tcoTotal: (a.valor ?? 0) + costoMant + costoFulla,
        };
      })
      .sort((a, b) => b.tcoTotal - a.tcoTotal)
      .slice(0, 10);

    const totalValorOriginalFlota = activos.reduce((s, a) => s + (a.valor ?? 0), 0);
    const totalCostoMantenimientos = Object.values(costoMantMap).reduce((s, v) => s + v, 0);
    const totalCostoFallas = Object.values(costoFallaMap).reduce((s, v) => s + v, 0);

    // Flota depreciada (>= 80%)
    const depreciadas = depreciacionBulk.activos.filter((d) => d.porcentajeDepreciado >= 80);
    const activoEstadoMap: Record<string, string> = {};
    for (const a of activos) {
      activoEstadoMap[a.id] = a.estado;
    }

    const flotaDepreciada = {
      count: depreciadas.length,
      porcentajeDeFlota: activos.length > 0 ? Math.round((depreciadas.length / activos.length) * 100) : 0,
      activos: depreciadas.map((d) => ({
        activoId: d.activoId,
        nombre: d.nombre,
        porcentajeDepreciado: d.porcentajeDepreciado,
        valorActual: d.valorActual,
        valorOriginal: d.valorOriginal,
        estado: activoEstadoMap[d.activoId] ?? 'desconocido',
      })),
    };

    // Disponibilidad por área: agrupar fallas usando el área del activo
    const areaMap: Record<string, { cantidadFallas: number; totalParadaMinutos: number }> = {};
    for (const f of fallas) {
      const activo = activos.find((a) => a.id === f.activoId);
      const area = activo?.areaId ?? 'Sin área';
      if (!areaMap[area]) {
        areaMap[area] = { cantidadFallas: 0, totalParadaMinutos: 0 };
      }
      areaMap[area].cantidadFallas += 1;
      areaMap[area].totalParadaMinutos += f.tiempoTotalParada ?? 0;
    }

    const disponibilidadPorArea = Object.entries(areaMap)
      .map(([area, datos]) => ({
        area,
        cantidadFallas: datos.cantidadFallas,
        totalParadaMinutos: datos.totalParadaMinutos,
        totalParadaHoras: Math.round((datos.totalParadaMinutos / 60) * 10) / 10,
      }))
      .sort((a, b) => b.cantidadFallas - a.cantidadFallas);

    return {
      flota,
      tco: {
        totalValorOriginalFlota: Math.round(totalValorOriginalFlota * 100) / 100,
        totalCostoMantenimientos: Math.round(totalCostoMantenimientos * 100) / 100,
        totalCostoFallas: Math.round(totalCostoFallas * 100) / 100,
        tcoTotal: Math.round((totalValorOriginalFlota + totalCostoMantenimientos + totalCostoFallas) * 100) / 100,
        ranking: tcoRanking,
      },
      flotaDepreciada,
      disponibilidadPorArea,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/dashboard/mantenimiento
  // ─────────────────────────────────────────────────────────────────────────────

  async getDashboardMantenimiento(): Promise<DashboardMantenimientoResponse> {
    const [mantenimientos, programaciones] = await Promise.all([
      this.mantenimientosService.findAllMantenimientos(),
      this.mantenimientosService.findAllProgramacion(),
    ]);

    // Ratio por tipo
    const ratioTipo = {
      preventivo: { count: 0, costoTotal: 0 },
      correctivo: { count: 0, costoTotal: 0 },
      calibracion: { count: 0, costoTotal: 0 },
    };

    for (const m of mantenimientos) {
      const tipo = m.tipo as keyof typeof ratioTipo;
      if (ratioTipo[tipo]) {
        ratioTipo[tipo].count += 1;
        ratioTipo[tipo].costoTotal += m.costoFinal ?? 0;
      }
    }

    const total = mantenimientos.length;
    const porcentajeCorrectivo =
      total > 0 ? Math.round((ratioTipo.correctivo.count / total) * 100) : 0;

    const costoPromedioPorTipo = {
      preventivo:
        ratioTipo.preventivo.count > 0
          ? Math.round((ratioTipo.preventivo.costoTotal / ratioTipo.preventivo.count) * 100) / 100
          : 0,
      correctivo:
        ratioTipo.correctivo.count > 0
          ? Math.round((ratioTipo.correctivo.costoTotal / ratioTipo.correctivo.count) * 100) / 100
          : 0,
      calibracion:
        ratioTipo.calibracion.count > 0
          ? Math.round((ratioTipo.calibracion.costoTotal / ratioTipo.calibracion.count) * 100) / 100
          : 0,
    };

    // Semáforos de programación
    const semaforos = { verde: 0, amarillo: 0, naranja: 0, rojo: 0 };
    for (const p of programaciones) {
      const s = p.semaforo as keyof typeof semaforos;
      if (semaforos[s] !== undefined) semaforos[s] += 1;
    }

    const totalProgramaciones = programaciones.length;
    const cumplimientoPorcentaje =
      totalProgramaciones > 0
        ? Math.round((semaforos.verde / totalProgramaciones) * 100)
        : 100;

    // Top 5 activos más costosos en mantenimiento
    const costoXActivo: Record<string, { activoId: string; activoNombre: string; cantidadMantenimientos: number; costoTotal: number }> = {};
    for (const m of mantenimientos) {
      if (!costoXActivo[m.activoId]) {
        costoXActivo[m.activoId] = {
          activoId: m.activoId,
          activoNombre: m.proveedorNombre ?? m.activoId, // usaremos activoId como fallback
          cantidadMantenimientos: 0,
          costoTotal: 0,
        };
      }
      costoXActivo[m.activoId].cantidadMantenimientos += 1;
      costoXActivo[m.activoId].costoTotal += m.costoFinal ?? 0;
    }

    // Enrich with activo nombre from programaciones if available
    for (const p of programaciones) {
      if (costoXActivo[p.activoId]) {
        costoXActivo[p.activoId].activoNombre = p.activoNombre;
      }
    }

    const top5MasCostosos = Object.values(costoXActivo)
      .sort((a, b) => b.costoTotal - a.costoTotal)
      .slice(0, 5);

    return {
      ratioTipo,
      porcentajeCorrectivo,
      costoPromedioPorTipo,
      semaforos,
      cumplimientoPorcentaje,
      top5MasCostosos,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/dashboard/fallas
  // ─────────────────────────────────────────────────────────────────────────────

  async getDashboardFallas(): Promise<DashboardFallasResponse> {
    const fallas = await this.fallasService.findAll();

    // Resumen general
    const porEstado: Record<string, number> = {};
    let sumaParada = 0;
    let countParada = 0;
    let totalCostoFallas = 0;
    let sumaRespuestaGerencia = 0;
    let countRespuesta = 0;
    let maxRespuesta = 0;
    let conteoSobreUmbral = 0;
    const UMBRAL_HORAS = 24;

    for (const f of fallas) {
      porEstado[f.estado] = (porEstado[f.estado] ?? 0) + 1;
      if (f.tiempoTotalParada != null) {
        sumaParada += f.tiempoTotalParada;
        countParada += 1;
      }
      totalCostoFallas += f.costoFalla ?? 0;
      if (f.tiempoRespuestaGerencia != null) {
        const horas = f.tiempoRespuestaGerencia / 60; // stored in minutes → hours
        sumaRespuestaGerencia += horas;
        countRespuesta += 1;
        if (horas > maxRespuesta) maxRespuesta = horas;
        if (horas > UMBRAL_HORAS) conteoSobreUmbral += 1;
      }
    }

    const promedioParadaMinutos = countParada > 0 ? sumaParada / countParada : 0;
    const promedioTiempoRespuesta = countRespuesta > 0 ? sumaRespuestaGerencia / countRespuesta : 0;

    // Ranking activos más problemáticos
    const porActivo: Record<
      string,
      { nombre: string; cantidadFallas: number; totalParadaMinutos: number; totalCosto: number }
    > = {};

    for (const f of fallas) {
      if (!porActivo[f.activoId]) {
        porActivo[f.activoId] = {
          nombre: f.activoNombre ?? f.activoId,
          cantidadFallas: 0,
          totalParadaMinutos: 0,
          totalCosto: 0,
        };
      }
      porActivo[f.activoId].cantidadFallas += 1;
      porActivo[f.activoId].totalParadaMinutos += f.tiempoTotalParada ?? 0;
      porActivo[f.activoId].totalCosto += f.costoFalla ?? 0;
    }

    const ranking = Object.entries(porActivo)
      .map(([activoId, d]) => ({
        activoId,
        nombre: d.nombre,
        cantidadFallas: d.cantidadFallas,
        totalParadaHoras: Math.round((d.totalParadaMinutos / 60) * 10) / 10,
        totalCosto: Math.round(d.totalCosto * 100) / 100,
      }))
      .sort((a, b) => b.cantidadFallas - a.cantidadFallas)
      .slice(0, 10);

    // MTBF: activos con 2+ fallas
    const fallasPorActivo: Record<string, string[]> = {};
    for (const f of fallas) {
      if (!fallasPorActivo[f.activoId]) fallasPorActivo[f.activoId] = [];
      fallasPorActivo[f.activoId].push(f.fechaDeteccion);
    }

    const mtbf: DashboardFallasResponse['mtbf'] = [];
    for (const [activoId, fechas] of Object.entries(fallasPorActivo)) {
      if (fechas.length < 2) continue;

      const sorted = fechas
        .map((f) => new Date(f).getTime())
        .filter((t) => !isNaN(t))
        .sort((a, b) => a - b);

      if (sorted.length < 2) continue;

      let sumaDiferencias = 0;
      for (let i = 1; i < sorted.length; i++) {
        sumaDiferencias += sorted[i] - sorted[i - 1];
      }
      const mtbfMs = sumaDiferencias / (sorted.length - 1);
      const mtbfDias = Math.round((mtbfMs / (1000 * 60 * 60 * 24)) * 10) / 10;

      const nombre = porActivo[activoId]?.nombre ?? activoId;
      mtbf.push({ activoId, nombre, cantidadFallas: fechas.length, mtbfDias });
    }

    mtbf.sort((a, b) => a.mtbfDias - b.mtbfDias); // menor MTBF primero = más crítico

    return {
      resumen: {
        total: fallas.length,
        porEstado,
        promedioParadaHoras: Math.round((promedioParadaMinutos / 60) * 10) / 10,
        totalCostoFallas: Math.round(totalCostoFallas * 100) / 100,
        promedioTiempoRespuestaGerenciaHoras: Math.round(promedioTiempoRespuesta * 10) / 10,
      },
      ranking,
      mtbf,
      tiempoRespuestaGerencia: {
        promedioHoras: Math.round(promedioTiempoRespuesta * 10) / 10,
        maxHoras: Math.round(maxRespuesta * 10) / 10,
        conteoSobreUmbral,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/dashboard/prestamos
  // ─────────────────────────────────────────────────────────────────────────────

  async getDashboardPrestamos(): Promise<DashboardPrestamosResponse> {
    const prestamos = await this.prestamosService.findAll();

    // Resumen
    const porEstado: Record<string, number> = {};
    let totalDanosReportados = 0;
    let costoTotalDanos = 0;

    for (const p of prestamos) {
      porEstado[p.estado] = (porEstado[p.estado] ?? 0) + 1;
      if (p.estadoDevolucion === 'danado') {
        totalDanosReportados += 1;
        costoTotalDanos += (p.costoReparacion ?? 0) + (p.costoReposicion ?? 0);
      }
    }

    // Demanda por herramienta (ventana: 720 h = 30 días)
    const VENTANA_HORAS = 720;
    const porHerramienta: Record<
      string,
      { nombre: string; cantidadPrestamos: number; totalHorasEstimadas: number }
    > = {};

    for (const p of prestamos) {
      if (!porHerramienta[p.herramientaId]) {
        porHerramienta[p.herramientaId] = {
          nombre: p.herramientaNombre ?? p.herramientaId,
          cantidadPrestamos: 0,
          totalHorasEstimadas: 0,
        };
      }
      porHerramienta[p.herramientaId].cantidadPrestamos += 1;
      porHerramienta[p.herramientaId].totalHorasEstimadas += p.tiempoEstimadoHoras ?? 0;
    }

    const demandaHerramientas = Object.entries(porHerramienta)
      .map(([herramientaId, d]) => ({
        herramientaId,
        nombre: d.nombre,
        cantidadPrestamos: d.cantidadPrestamos,
        totalHorasEstimadas: Math.round(d.totalHorasEstimadas * 10) / 10,
        porcentajeTiempoPrestado: Math.min(
          100,
          Math.round((d.totalHorasEstimadas / VENTANA_HORAS) * 1000) / 10,
        ),
      }))
      .sort((a, b) => b.totalHorasEstimadas - a.totalHorasEstimadas)
      .slice(0, 10);

    // Técnicos con daño
    const porTecnico: Record<
      string,
      { nombre: string; prestamosConDano: number; costoReparacionTotal: number; costoReposicionTotal: number }
    > = {};

    for (const p of prestamos) {
      if (p.estadoDevolucion !== 'danado') continue;
      if (!porTecnico[p.solicitanteId]) {
        porTecnico[p.solicitanteId] = {
          nombre: p.solicitanteNombre ?? p.solicitanteId,
          prestamosConDano: 0,
          costoReparacionTotal: 0,
          costoReposicionTotal: 0,
        };
      }
      porTecnico[p.solicitanteId].prestamosConDano += 1;
      porTecnico[p.solicitanteId].costoReparacionTotal += p.costoReparacion ?? 0;
      porTecnico[p.solicitanteId].costoReposicionTotal += p.costoReposicion ?? 0;
    }

    const tecnicosConDano = Object.entries(porTecnico)
      .map(([tecnicoId, d]) => ({
        tecnicoId,
        nombre: d.nombre,
        prestamosConDano: d.prestamosConDano,
        costoReparacionTotal: Math.round(d.costoReparacionTotal * 100) / 100,
        costoReposicionTotal: Math.round(d.costoReposicionTotal * 100) / 100,
        costoTotal: Math.round((d.costoReparacionTotal + d.costoReposicionTotal) * 100) / 100,
      }))
      .sort((a, b) => b.costoTotal - a.costoTotal);

    return {
      resumen: {
        total: prestamos.length,
        porEstado,
        totalDanosReportados,
        costoTotalDanos: Math.round(costoTotalDanos * 100) / 100,
      },
      demandaHerramientas,
      tecnicosConDano,
    };
  }
}
