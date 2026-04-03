import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MantenimientosService } from './mantenimientos.service';
import {
  CreateProgramacionDto,
  UpdateProgramacionDto,
  CreateMantenimientoDto,
} from './dto/mantenimiento.dto';

@ApiTags('mantenimientos')
@Controller('api/mantenimientos')
export class MantenimientosController {
  constructor(private readonly mantenimientosService: MantenimientosService) {}

  // ─── Programación ────────────────────────────────────────────────────────────

  @Get('programacion')
  @ApiOperation({ summary: 'Obtener todas las programaciones con semáforo calculado' })
  @ApiResponse({ status: 200, description: 'Lista de programaciones con semáforo' })
  findAllProgramacion() {
    return this.mantenimientosService.findAllProgramacion();
  }

  @Get('programacion/alertas')
  @ApiOperation({ summary: 'Obtener programaciones con alertas (semáforo != verde)' })
  @ApiResponse({ status: 200, description: 'Lista de programaciones con alerta (amarillo, naranja, rojo)' })
  findAlertasProgramacion() {
    return this.mantenimientosService.findAlertasProgramacion();
  }

  @Post('programacion')
  @ApiOperation({ summary: 'Crear nueva programación de mantenimiento' })
  @ApiResponse({ status: 201, description: 'Programación creada con semáforo calculado' })
  createProgramacion(@Body() dto: CreateProgramacionDto) {
    return this.mantenimientosService.createProgramacion(dto, 'demo-user');
  }

  @Patch('programacion/:id')
  @ApiOperation({ summary: 'Actualizar una programación existente' })
  @ApiParam({ name: 'id', description: 'ID de la programación', example: 'prog-001' })
  @ApiResponse({ status: 200, description: 'Programación actualizada' })
  @ApiResponse({ status: 404, description: 'Programación no encontrada' })
  updateProgramacion(@Param('id') id: string, @Body() dto: UpdateProgramacionDto) {
    return this.mantenimientosService.updateProgramacion(id, dto);
  }

  @Delete('programacion/:id')
  @ApiOperation({ summary: 'Eliminar una programación de mantenimiento' })
  @ApiParam({ name: 'id', description: 'ID de la programación', example: 'prog-001' })
  @ApiResponse({ status: 200, description: 'Programación eliminada' })
  @ApiResponse({ status: 404, description: 'Programación no encontrada' })
  deleteProgramacion(@Param('id') id: string) {
    return this.mantenimientosService.deleteProgramacion(id);
  }

  // ─── Mantenimientos ejecutados ───────────────────────────────────────────────

  @Get('activo/:activoId/historial')
  @ApiOperation({ summary: 'Obtener historial de mantenimientos de un activo' })
  @ApiParam({ name: 'activoId', description: 'ID del activo', example: 'A001' })
  @ApiResponse({ status: 200, description: 'Historial de mantenimientos ordenado por fecha DESC' })
  getHistorialActivo(@Param('activoId') activoId: string) {
    return this.mantenimientosService.getHistorialActivo(activoId);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Cargar datos iniciales de mantenimientos (seed) — idempotente' })
  @ApiResponse({ status: 201, description: 'Seed ejecutado. Retorna conteo de registros creados' })
  seedData() {
    return this.mantenimientosService.seedData();
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los mantenimientos ejecutados' })
  @ApiQuery({ name: 'activoId', required: false, description: 'Filtrar por ID del activo' })
  @ApiResponse({ status: 200, description: 'Lista de mantenimientos ejecutados' })
  findAllMantenimientos(@Query('activoId') activoId?: string) {
    return this.mantenimientosService.findAllMantenimientos(activoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un mantenimiento por ID' })
  @ApiParam({ name: 'id', description: 'ID del mantenimiento', example: 'mant-001' })
  @ApiResponse({ status: 200, description: 'Mantenimiento encontrado' })
  @ApiResponse({ status: 404, description: 'Mantenimiento no encontrado' })
  findOneMantenimiento(@Param('id') id: string) {
    return this.mantenimientosService.findOneMantenimiento(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un mantenimiento ejecutado' })
  @ApiResponse({ status: 201, description: 'Mantenimiento registrado y programación actualizada' })
  createMantenimiento(@Body() dto: CreateMantenimientoDto) {
    return this.mantenimientosService.createMantenimiento(dto, 'demo-user');
  }
}
