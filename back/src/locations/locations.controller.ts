import { Controller, Get, Post, Param, OnModuleInit } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('api')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('areas')
  @ApiOperation({ summary: 'Obtener todas las áreas del taller' })
  @ApiResponse({ status: 200, description: 'Lista de áreas' })
  findAllAreas() {
    return this.locationsService.findAllAreas();
  }

  @Get('areas/:id')
  @ApiOperation({ summary: 'Obtener un área por ID' })
  @ApiParam({ name: 'id', description: 'ID del área' })
  @ApiResponse({ status: 200, description: 'Área encontrada' })
  @ApiResponse({ status: 404, description: 'Área no encontrada' })
  findAreaById(@Param('id') id: string) {
    return this.locationsService.findAreaById(id);
  }

  @Get('areas/:areaId/bahias')
  @ApiOperation({ summary: 'Obtener bahías de un área' })
  @ApiParam({ name: 'areaId', description: 'ID del área' })
  @ApiResponse({ status: 200, description: 'Lista de bahías del área' })
  findBahiasByArea(@Param('areaId') areaId: string) {
    return this.locationsService.findBahiasByArea(areaId);
  }

  @Get('bahias/:bahiaId/racks')
  @ApiOperation({ summary: 'Obtener racks de una bahía' })
  @ApiParam({ name: 'bahiaId', description: 'ID de la bahía' })
  @ApiResponse({ status: 200, description: 'Lista de racks de la bahía' })
  findRacksByBahia(@Param('bahiaId') bahiaId: string) {
    return this.locationsService.findRacksByBahia(bahiaId);
  }

  @Get('racks/:rackId/cajas')
  @ApiOperation({ summary: 'Obtener cajas de un rack' })
  @ApiParam({ name: 'rackId', description: 'ID del rack' })
  @ApiResponse({ status: 200, description: 'Lista de cajas del rack' })
  findCajasByRack(@Param('rackId') rackId: string) {
    return this.locationsService.findCajasByRack(rackId);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Cargar ubicaciones iniciales (áreas, bahías, racks, cajas) — idempotente' })
  @ApiResponse({ status: 201, description: 'Seed de ubicaciones ejecutado correctamente' })
  seedInitialData() {
    return this.locationsService.seedInitialData();
  }
}
