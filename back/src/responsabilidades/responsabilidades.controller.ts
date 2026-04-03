import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ResponsabilidadesService } from './responsabilidades.service';
import { CreatePeriodoDto } from './dto/create-periodo.dto';
import { CreatePersonalDto } from './dto/create-personal.dto';

@ApiTags('responsabilidades')
@Controller()
export class ResponsabilidadesController {
  constructor(
    private readonly responsabilidadesService: ResponsabilidadesService,
  ) {}

  // ─── Períodos ────────────────────────────────────────────────────────────────

  @Get('api/responsabilidades')
  @ApiOperation({ summary: 'Obtener todos los períodos de responsabilidad' })
  @ApiResponse({ status: 200, description: 'Lista de todos los períodos' })
  findAllPeriodos() {
    return this.responsabilidadesService.findAllPeriodos();
  }

  @Get('api/responsabilidades/activos')
  @ApiOperation({ summary: 'Obtener períodos de responsabilidad activos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de períodos activos (sin fechaFin)',
  })
  findActivos() {
    return this.responsabilidadesService.findActivos();
  }

  @Get('api/responsabilidades/area/:area/historial')
  @ApiOperation({ summary: 'Obtener historial de responsabilidades por área' })
  @ApiParam({ name: 'area', description: 'Nombre del área', example: 'Taller' })
  @ApiResponse({
    status: 200,
    description: 'Historial de períodos del área ordenado por fechaInicio DESC',
  })
  findHistorialByArea(@Param('area') area: string) {
    return this.responsabilidadesService.findHistorialByArea(area);
  }

  @Post('api/responsabilidades')
  @ApiOperation({ summary: 'Crear nueva asignación de responsabilidad' })
  @ApiBody({ type: CreatePeriodoDto })
  @ApiResponse({ status: 201, description: 'Período creado exitosamente' })
  @ApiResponse({
    status: 200,
    description: 'Período duplicado — retorna { ok: false, razon: "duplicado", periodoExistente }',
  })
  crearPeriodo(@Body() dto: CreatePeriodoDto) {
    return this.responsabilidadesService.crearPeriodo(dto, dto.asignadoPor);
  }

  @Patch('api/responsabilidades/:id/cerrar')
  @ApiOperation({ summary: 'Cerrar período de responsabilidad' })
  @ApiParam({ name: 'id', description: 'ID del período a cerrar', example: 'RESP-001' })
  @ApiResponse({ status: 200, description: 'Período cerrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Período no encontrado' })
  cerrarPeriodo(@Param('id') id: string) {
    return this.responsabilidadesService.cerrarPeriodo(id);
  }

  @Post('api/responsabilidades/:id/reasignar')
  @ApiOperation({
    summary: 'Reasignar responsabilidad — cierra período anterior y crea uno nuevo',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del período anterior a cerrar',
    example: 'RESP-001',
  })
  @ApiBody({ type: CreatePeriodoDto })
  @ApiResponse({
    status: 201,
    description: 'Reasignación completada: período anterior cerrado, nuevo período creado',
  })
  @ApiResponse({ status: 404, description: 'Período anterior no encontrado' })
  reasignar(@Param('id') id: string, @Body() dto: CreatePeriodoDto) {
    return this.responsabilidadesService.reasignar(id, dto, dto.asignadoPor);
  }

  // ─── Personal ────────────────────────────────────────────────────────────────

  @Get('api/personal')
  @ApiTags('personal')
  @ApiOperation({ summary: 'Obtener todo el personal del taller' })
  @ApiResponse({ status: 200, description: 'Lista de todo el personal (activo e inactivo)' })
  findAllPersonal() {
    return this.responsabilidadesService.findAllPersonal();
  }

  @Get('api/personal/activo')
  @ApiTags('personal')
  @ApiOperation({ summary: 'Obtener personal activo del taller' })
  @ApiResponse({ status: 200, description: 'Lista de personal con activo === true' })
  findPersonalActivo() {
    return this.responsabilidadesService.findPersonalActivo();
  }

  @Post('api/personal')
  @ApiTags('personal')
  @ApiOperation({ summary: 'Crear nuevo personal de taller' })
  @ApiBody({ type: CreatePersonalDto })
  @ApiResponse({ status: 201, description: 'Personal creado exitosamente' })
  crearPersonal(@Body() dto: CreatePersonalDto) {
    return this.responsabilidadesService.crearPersonal(dto);
  }

  // ─── Seed ────────────────────────────────────────────────────────────────────

  @Post('api/responsabilidades/seed')
  @ApiOperation({ summary: 'Cargar datos iniciales (seed) — idempotente' })
  @ApiResponse({
    status: 201,
    description: 'Seed ejecutado. Retorna { personal, periodos, mensaje }',
  })
  seed() {
    return this.responsabilidadesService.seedData();
  }
}
