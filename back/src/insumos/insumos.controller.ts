import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { InsumosService } from './insumos.service';
import {
  CreateCatalogoInsumoDto,
  UpdateCatalogoInsumoDto,
  RegistrarConsumoDto,
} from './dto/insumo.dto';

@ApiTags('insumos')
@Controller('api/insumos')
export class InsumosController {
  constructor(private readonly insumosService: InsumosService) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  //  CATÁLOGO
  // ═══════════════════════════════════════════════════════════════════════════════

  @Get('catalogo')
  @ApiOperation({ summary: 'Obtener catálogo completo de insumos' })
  @ApiResponse({ status: 200, description: 'Lista de insumos del catálogo' })
  findAllCatalogo() {
    return this.insumosService.findAllCatalogo();
  }

  @Post('catalogo')
  @ApiOperation({ summary: 'Agregar un insumo al catálogo' })
  @ApiBody({ type: CreateCatalogoInsumoDto })
  @ApiResponse({ status: 201, description: 'Insumo creado en catálogo' })
  createCatalogoInsumo(@Body() dto: CreateCatalogoInsumoDto) {
    return this.insumosService.createCatalogoInsumo(dto);
  }

  @Patch('catalogo/:id')
  @ApiOperation({ summary: 'Actualizar un insumo del catálogo' })
  @ApiParam({ name: 'id', description: 'ID del insumo', example: 'INS-001' })
  @ApiBody({ type: UpdateCatalogoInsumoDto })
  @ApiResponse({ status: 200, description: 'Insumo actualizado' })
  @ApiResponse({ status: 404, description: 'Insumo no encontrado' })
  updateCatalogoInsumo(
    @Param('id') id: string,
    @Body() dto: UpdateCatalogoInsumoDto,
  ) {
    return this.insumosService.updateCatalogoInsumo(id, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  CONSUMOS
  // ═══════════════════════════════════════════════════════════════════════════════

  @Post('consumo')
  @ApiOperation({ summary: 'Registrar consumo de insumo en una OT' })
  @ApiBody({ type: RegistrarConsumoDto })
  @ApiResponse({ status: 201, description: 'Consumo registrado. Calcula costo y desviación automáticamente.' })
  @ApiResponse({ status: 400, description: 'Desviación excede tolerancia y no se proporcionó justificación' })
  @ApiResponse({ status: 404, description: 'Insumo no encontrado en catálogo' })
  registrarConsumo(@Body() dto: RegistrarConsumoDto) {
    return this.insumosService.registrarConsumo(dto);
  }

  @Get('consumos')
  @ApiOperation({ summary: 'Listar consumos con filtros opcionales' })
  @ApiQuery({ name: 'otId', required: false, description: 'Filtrar por orden de trabajo' })
  @ApiQuery({ name: 'tecnicoId', required: false, description: 'Filtrar por técnico' })
  @ApiQuery({ name: 'areaId', required: false, description: 'Filtrar por área' })
  @ApiResponse({ status: 200, description: 'Lista de registros de consumo' })
  findAllConsumos(
    @Query('otId') otId?: string,
    @Query('tecnicoId') tecnicoId?: string,
    @Query('areaId') areaId?: string,
  ) {
    return this.insumosService.findAllConsumos(otId, tecnicoId, areaId);
  }

  @Get('consumos/ot/:otId')
  @ApiOperation({ summary: 'Obtener todos los consumos de una orden de trabajo con costo total' })
  @ApiParam({ name: 'otId', description: 'ID de la orden de trabajo', example: 'OT-2025-0042' })
  @ApiResponse({ status: 200, description: 'Consumos de la OT y costo total agregado' })
  getConsumosPorOT(@Param('otId') otId: string) {
    return this.insumosService.getConsumosPorOT(otId);
  }

  @Get('consumos/tecnico/:tecnicoId')
  @ApiOperation({ summary: 'Obtener historial de consumos de un técnico' })
  @ApiParam({ name: 'tecnicoId', description: 'ID del técnico', example: 'user-003' })
  @ApiResponse({ status: 200, description: 'Lista de consumos registrados por el técnico' })
  getConsumosPorTecnico(@Param('tecnicoId') tecnicoId: string) {
    return this.insumosService.getConsumosPorTecnico(tecnicoId);
  }

  @Get('consumos/area/:areaId')
  @ApiOperation({ summary: 'Resumen de consumos agregados por área' })
  @ApiParam({ name: 'areaId', description: 'ID del área', example: 'area-taller' })
  @ApiQuery({ name: 'periodo', required: false, description: 'Filtrar por periodo (YYYY-MM)', example: '2025-03' })
  @ApiResponse({ status: 200, description: 'Resumen: costo total, registros, desglose por insumo' })
  getResumenPorArea(
    @Param('areaId') areaId: string,
    @Query('periodo') periodo?: string,
  ) {
    return this.insumosService.getResumenPorArea(areaId, periodo);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  ANOMALÍAS
  // ═══════════════════════════════════════════════════════════════════════════════

  @Get('anomalias')
  @ApiOperation({ summary: 'Analizar anomalías de consumo (mean + 2*stddev)' })
  @ApiQuery({ name: 'periodo', required: false, description: 'Filtrar por periodo (YYYY-MM)', example: '2025-03' })
  @ApiResponse({ status: 200, description: 'Lista de anomalías ordenadas por severidad (crítico → alerta → normal)' })
  analizarAnomalias(@Query('periodo') periodo?: string) {
    return this.insumosService.analizarAnomalias(periodo);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  SEED
  // ═══════════════════════════════════════════════════════════════════════════════

  @Post('seed')
  @ApiOperation({ summary: 'Cargar datos de prueba (catálogo + consumos) — idempotente' })
  @ApiResponse({ status: 201, description: 'Seed ejecutado. Retorna { catalogo, consumos, mensaje }' })
  seed() {
    return this.insumosService.seedData();
  }
}
