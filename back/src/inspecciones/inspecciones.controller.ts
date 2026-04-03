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
import { InspeccionesService } from './inspecciones.service';
import {
  CreateInspeccionDto,
  AgregarFotoDto,
  AgregarDiscrepanciaDto,
  ResolverDiscrepanciaDto,
  CompletarInspeccionDto,
} from './dto/inspeccion.dto';

@ApiTags('inspecciones')
@Controller('api/inspecciones')
export class InspeccionesController {
  constructor(private readonly inspeccionesService: InspeccionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las inspecciones (opcional filtrar por estado)' })
  @ApiQuery({ name: 'estado', required: false, enum: ['programada', 'en_proceso', 'completada', 'con_discrepancia'], description: 'Filtrar por estado' })
  @ApiResponse({ status: 200, description: 'Lista de inspecciones' })
  findAll(@Query('estado') estado?: string) {
    return this.inspeccionesService.findAll(estado);
  }

  @Get('pendientes')
  @ApiOperation({ summary: 'Obtener inspecciones pendientes (programadas o vencidas)' })
  @ApiResponse({ status: 200, description: 'Lista de inspecciones pendientes' })
  findPendientes() {
    return this.inspeccionesService.findPendientes();
  }

  @Get('area/:areaId')
  @ApiOperation({ summary: 'Obtener inspecciones de un área específica' })
  @ApiParam({ name: 'areaId', description: 'ID del área', example: 'area-taller' })
  @ApiResponse({ status: 200, description: 'Inspecciones del área' })
  findByArea(@Param('areaId') areaId: string) {
    return this.inspeccionesService.findByArea(areaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una inspección por ID' })
  @ApiParam({ name: 'id', description: 'ID de la inspección', example: 'INSP-001' })
  @ApiResponse({ status: 200, description: 'Inspección encontrada' })
  @ApiResponse({ status: 404, description: 'Inspección no encontrada' })
  findOne(@Param('id') id: string) {
    return this.inspeccionesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva inspección fotográfica' })
  @ApiBody({ type: CreateInspeccionDto })
  @ApiResponse({ status: 201, description: 'Inspección creada con estado "programada"' })
  create(@Body() dto: CreateInspeccionDto) {
    return this.inspeccionesService.create(dto);
  }

  @Patch(':id/foto')
  @ApiOperation({ summary: 'Agregar foto a una inspección' })
  @ApiParam({ name: 'id', description: 'ID de la inspección', example: 'INSP-001' })
  @ApiBody({ type: AgregarFotoDto })
  @ApiResponse({ status: 200, description: 'Foto agregada a la inspección' })
  @ApiResponse({ status: 404, description: 'Inspección no encontrada' })
  agregarFoto(@Param('id') id: string, @Body() dto: AgregarFotoDto) {
    return this.inspeccionesService.agregarFoto(id, dto);
  }

  @Patch(':id/discrepancia')
  @ApiOperation({ summary: 'Registrar discrepancia en una inspección' })
  @ApiParam({ name: 'id', description: 'ID de la inspección', example: 'INSP-001' })
  @ApiBody({ type: AgregarDiscrepanciaDto })
  @ApiResponse({ status: 200, description: 'Discrepancia registrada, estado cambia a "con_discrepancia"' })
  @ApiResponse({ status: 404, description: 'Inspección no encontrada' })
  agregarDiscrepancia(@Param('id') id: string, @Body() dto: AgregarDiscrepanciaDto) {
    return this.inspeccionesService.agregarDiscrepancia(id, dto);
  }

  @Patch(':id/discrepancia/resolver')
  @ApiOperation({ summary: 'Resolver una discrepancia específica' })
  @ApiParam({ name: 'id', description: 'ID de la inspección', example: 'INSP-002' })
  @ApiBody({ type: ResolverDiscrepanciaDto })
  @ApiResponse({ status: 200, description: 'Discrepancia resuelta con el resultado indicado' })
  @ApiResponse({ status: 400, description: 'Índice de discrepancia fuera de rango' })
  @ApiResponse({ status: 404, description: 'Inspección no encontrada' })
  resolverDiscrepancia(@Param('id') id: string, @Body() dto: ResolverDiscrepanciaDto) {
    return this.inspeccionesService.resolverDiscrepancia(id, dto);
  }

  @Patch(':id/completar')
  @ApiOperation({ summary: 'Completar una inspección (cierra y agenda próxima en 7 días)' })
  @ApiParam({ name: 'id', description: 'ID de la inspección', example: 'INSP-001' })
  @ApiBody({ type: CompletarInspeccionDto })
  @ApiResponse({ status: 200, description: 'Inspección completada, próxima inspección agendada automáticamente' })
  @ApiResponse({ status: 404, description: 'Inspección no encontrada' })
  completar(@Param('id') id: string, @Body() dto: CompletarInspeccionDto) {
    return this.inspeccionesService.completar(id, dto);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Cargar datos de ejemplo (seed) — idempotente' })
  @ApiResponse({ status: 201, description: 'Seed ejecutado o ya existían datos' })
  seed() {
    return this.inspeccionesService.seedData();
  }
}
