import { Controller, Get, Post, Param, OnModuleInit } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('api')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('areas')
  findAllAreas() {
    return this.locationsService.findAllAreas();
  }

  @Get('areas/:id')
  findAreaById(@Param('id') id: string) {
    return this.locationsService.findAreaById(id);
  }

  @Get('areas/:areaId/bahias')
  findBahiasByArea(@Param('areaId') areaId: string) {
    return this.locationsService.findBahiasByArea(areaId);
  }

  @Get('bahias/:bahiaId/racks')
  findRacksByBahia(@Param('bahiaId') bahiaId: string) {
    return this.locationsService.findRacksByBahia(bahiaId);
  }

  @Get('racks/:rackId/cajas')
  findCajasByRack(@Param('rackId') rackId: string) {
    return this.locationsService.findCajasByRack(rackId);
  }

  @Post('seed')
  seedInitialData() {
    return this.locationsService.seedInitialData();
  }
}
