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
import { EppService } from './epp.service';
import {
  CreateCatalogoEPPDto,
  UpdateCatalogoEPPDto,
  RegistrarEntregaDto,
} from './dto/epp.dto';

@ApiTags('epp')
@Controller('api/epp')
export class EppController {
  constructor(private readonly eppService: EppService) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  //  CATÁLOGO
  // ═══════════════════════════════════════════════════════════════════════════════

  @Get('catalogo')
  @ApiOperation({ summary: 'Obtener catálogo completo de EPP' })
  @ApiResponse({ status: 200, description: 'Lista de EPP del catálogo' })
  findAllCatalogo() {
    return this.eppService.findAllCatalogo();
  }

  @Post('catalogo')
  @ApiOperation({ summary: 'Agregar un EPP al catálogo' })
  @ApiBody({ type: CreateCatalogoEPPDto })
  @ApiResponse({ status: 201, description: 'EPP creado en catálogo' })
  createCatalogoEPP(@Body() dto: CreateCatalogoEPPDto) {
    return this.eppService.createCatalogoEPP(dto);
  }

  @Patch('catalogo/:id')
  @ApiOperation({ summary: 'Actualizar un EPP del catálogo' })
  @ApiParam({ name: 'id', description: 'ID del EPP', example: 'EPP-001' })
  @ApiBody({ type: UpdateCatalogoEPPDto })
  @ApiResponse({ status: 200, description: 'EPP actualizado' })
  @ApiResponse({ status: 404, description: 'EPP no encontrado' })
  updateCatalogoEPP(
    @Param('id') id: string,
    @Body() dto: UpdateCatalogoEPPDto,
  ) {
    return this.eppService.updateCatalogoEPP(id, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  ENTREGAS
  // ═══════════════════════════════════════════════════════════════════════════════

  @Post('entrega')
  @ApiOperation({ summary: 'Registrar entrega de EPP a técnico' })
  @ApiBody({ type: RegistrarEntregaDto })
  @ApiResponse({ status: 201, description: 'Entrega registrada. Calcula próxima reposición automáticamente.' })
  @ApiResponse({ status: 400, description: 'Entrega extraordinaria sin motivo' })
  @ApiResponse({ status: 404, description: 'EPP no encontrado en catálogo' })
  registrarEntrega(@Body() dto: RegistrarEntregaDto) {
    return this.eppService.registrarEntrega(dto);
  }

  @Get('entregas')
  @ApiOperation({ summary: 'Listar entregas de EPP con filtros opcionales' })
  @ApiQuery({ name: 'tecnicoId', required: false, description: 'Filtrar por técnico' })
  @ApiQuery({ name: 'areaId', required: false, description: 'Filtrar por área' })
  @ApiQuery({ name: 'tipo', required: false, description: 'Filtrar por tipo de EPP' })
  @ApiResponse({ status: 200, description: 'Lista de entregas de EPP' })
  findAllEntregas(
    @Query('tecnicoId') tecnicoId?: string,
    @Query('areaId') areaId?: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.eppService.findAllEntregas(tecnicoId, areaId, tipo);
  }

  @Get('entregas/pendientes')
  @ApiOperation({ summary: 'Obtener entregas con reposición pendiente (próximos 7 días)' })
  @ApiResponse({ status: 200, description: 'Lista de entregas cuya próxima reposición es <= hoy + 7 días' })
  getEntregasPendientes() {
    return this.eppService.getEntregasPendientes();
  }

  @Get('entregas/calendario')
  @ApiOperation({ summary: 'Calendario semanal de entregas de EPP agrupado por técnico' })
  @ApiResponse({ status: 200, description: 'Objeto { tecnicoId: { tecnicoNombre, entregas[] } }' })
  getCalendarioSemanal() {
    return this.eppService.getCalendarioSemanal();
  }

  @Get('entregas/tecnico/:tecnicoId')
  @ApiOperation({ summary: 'Historial completo de entregas de EPP de un técnico' })
  @ApiParam({ name: 'tecnicoId', description: 'ID del técnico', example: 'user-003' })
  @ApiResponse({ status: 200, description: 'Lista de entregas ordenadas por fecha descendente' })
  getHistorialTecnico(@Param('tecnicoId') tecnicoId: string) {
    return this.eppService.getHistorialTecnico(tecnicoId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  COMPARATIVA
  // ═══════════════════════════════════════════════════════════════════════════════

  @Get('comparativa')
  @ApiOperation({ summary: 'Comparativa de consumo EPP por técnico (índice consumo real / esperado)' })
  @ApiQuery({ name: 'areaId', required: false, description: 'Filtrar por área' })
  @ApiQuery({ name: 'periodo', required: false, description: 'Filtrar por periodo (YYYY-MM)', example: '2025-03' })
  @ApiResponse({ status: 200, description: 'Lista de comparativas. alerta=true cuando índice > 1.3' })
  getComparativa(
    @Query('areaId') areaId?: string,
    @Query('periodo') periodo?: string,
  ) {
    return this.eppService.getComparativa(areaId, periodo);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  SEED
  // ═══════════════════════════════════════════════════════════════════════════════

  @Post('seed')
  @ApiOperation({ summary: 'Cargar datos de prueba (catálogo + entregas) — idempotente' })
  @ApiResponse({ status: 201, description: 'Seed ejecutado. Retorna { catalogo, entregas, mensaje }' })
  seed() {
    return this.eppService.seedData();
  }
}
