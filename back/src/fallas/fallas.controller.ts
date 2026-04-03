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
import { FallasService } from './fallas.service';
import { CreateFallaDto, UpdateFallaDto } from './dto/falla.dto';

@ApiTags('fallas')
@Controller('api/fallas')
export class FallasController {
  constructor(private readonly fallasService: FallasService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las fallas reportadas' })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['reportada', 'evaluando', 'en_reparacion', 'reparada', 'descartada'],
    description: 'Filtrar por estado de la falla',
  })
  @ApiResponse({ status: 200, description: 'Lista de fallas' })
  findAll(@Query('estado') estado?: string) {
    return this.fallasService.findAll(estado);
  }

  @Get('metricas')
  @ApiOperation({ summary: 'Obtener métricas agregadas de fallas' })
  @ApiResponse({
    status: 200,
    description: 'Métricas: total, por estado, promedios de tiempos, costo total',
  })
  getMetricas() {
    return this.fallasService.getMetricas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una falla por ID' })
  @ApiParam({ name: 'id', description: 'ID de la falla', example: 'F001' })
  @ApiResponse({ status: 200, description: 'Falla encontrada' })
  @ApiResponse({ status: 404, description: 'Falla no encontrada' })
  findOne(@Param('id') id: string) {
    return this.fallasService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Reportar una nueva falla' })
  @ApiBody({ type: CreateFallaDto })
  @ApiResponse({ status: 201, description: 'Falla creada exitosamente' })
  create(@Body() createFallaDto: CreateFallaDto) {
    return this.fallasService.create(createFallaDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de una falla' })
  @ApiParam({ name: 'id', description: 'ID de la falla', example: 'F001' })
  @ApiBody({ type: UpdateFallaDto })
  @ApiResponse({ status: 200, description: 'Falla actualizada' })
  @ApiResponse({ status: 404, description: 'Falla no encontrada' })
  update(@Param('id') id: string, @Body() updateFallaDto: UpdateFallaDto) {
    return this.fallasService.update(id, updateFallaDto);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Cargar fallas de ejemplo (seed) — idempotente' })
  @ApiResponse({ status: 201, description: 'Seed ejecutado' })
  seed() {
    return this.fallasService.seedData();
  }
}
