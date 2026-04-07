import { Controller, Get, Post, Patch, Delete, Param, Body, OnModuleInit } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('api')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // ── LOCATION TREE ──

  @Get('locations/tree')
  @ApiOperation({ summary: 'Árbol completo de ubicaciones (areas, bahias, racks)' })
  @ApiResponse({ status: 200, description: 'Árbol de ubicaciones' })
  findLocationTree() {
    return this.locationsService.findLocationTree();
  }

  // ── AREAS ──

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

  @Post('areas')
  @ApiOperation({ summary: 'Crear una nueva área' })
  createArea(@Body() data: any) {
    return this.locationsService.createArea(data);
  }

  @Patch('areas/:id')
  @ApiOperation({ summary: 'Actualizar un área' })
  updateArea(@Param('id') id: string, @Body() data: any) {
    return this.locationsService.updateArea(id, data);
  }

  @Delete('areas/:id')
  @ApiOperation({ summary: 'Eliminar un área' })
  removeArea(@Param('id') id: string) {
    return this.locationsService.removeArea(id);
  }

  // ── BAHIAS ──

  @Get('areas/:areaId/bahias')
  @ApiOperation({ summary: 'Obtener bahías de un área' })
  @ApiParam({ name: 'areaId', description: 'ID del área' })
  @ApiResponse({ status: 200, description: 'Lista de bahías del área' })
  findBahiasByArea(@Param('areaId') areaId: string) {
    return this.locationsService.findBahiasByArea(areaId);
  }

  @Post('bahias')
  @ApiOperation({ summary: 'Crear una nueva bahía' })
  createBahia(@Body() data: any) {
    return this.locationsService.createBahia(data);
  }

  @Patch('bahias/:id')
  @ApiOperation({ summary: 'Actualizar una bahía' })
  updateBahia(@Param('id') id: string, @Body() data: any) {
    return this.locationsService.updateBahia(id, data);
  }

  @Delete('bahias/:id')
  @ApiOperation({ summary: 'Eliminar una bahía' })
  removeBahia(@Param('id') id: string) {
    return this.locationsService.removeBahia(id);
  }

  // ── RACKS ──

  @Get('bahias/:bahiaId/racks')
  @ApiOperation({ summary: 'Obtener racks de una bahía' })
  @ApiParam({ name: 'bahiaId', description: 'ID de la bahía' })
  @ApiResponse({ status: 200, description: 'Lista de racks de la bahía' })
  findRacksByBahia(@Param('bahiaId') bahiaId: string) {
    return this.locationsService.findRacksByBahia(bahiaId);
  }

  @Post('racks')
  @ApiOperation({ summary: 'Crear un nuevo rack' })
  createRack(@Body() data: any) {
    return this.locationsService.createRack(data);
  }

  @Patch('racks/:id')
  @ApiOperation({ summary: 'Actualizar un rack' })
  updateRack(@Param('id') id: string, @Body() data: any) {
    return this.locationsService.updateRack(id, data);
  }

  @Delete('racks/:id')
  @ApiOperation({ summary: 'Eliminar un rack' })
  removeRack(@Param('id') id: string) {
    return this.locationsService.removeRack(id);
  }

  // ── CAJAS ──

  @Get('racks/:rackId/cajas')
  @ApiOperation({ summary: 'Obtener cajas de un rack' })
  @ApiParam({ name: 'rackId', description: 'ID del rack' })
  @ApiResponse({ status: 200, description: 'Lista de cajas del rack' })
  findCajasByRack(@Param('rackId') rackId: string) {
    return this.locationsService.findCajasByRack(rackId);
  }

  @Post('cajas')
  @ApiOperation({ summary: 'Crear una nueva caja' })
  createCaja(@Body() data: any) {
    return this.locationsService.createCaja(data);
  }

  @Patch('cajas/:id')
  @ApiOperation({ summary: 'Actualizar una caja' })
  updateCaja(@Param('id') id: string, @Body() data: any) {
    return this.locationsService.updateCaja(id, data);
  }

  @Delete('cajas/:id')
  @ApiOperation({ summary: 'Eliminar una caja' })
  removeCaja(@Param('id') id: string) {
    return this.locationsService.removeCaja(id);
  }

  // ── SEED ──

  @Post('seed')
  @ApiOperation({ summary: 'Cargar ubicaciones iniciales (áreas, bahías, racks, cajas) — idempotente' })
  @ApiResponse({ status: 201, description: 'Seed de ubicaciones ejecutado correctamente' })
  seedInitialData() {
    return this.locationsService.seedInitialData();
  }
}
