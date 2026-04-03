import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CotizacionesService } from './cotizaciones.service';
import {
  CreateCotizacionDto,
  AddProformaDto,
  SeleccionarProformaDto,
  AprobarCotizacionDto,
  RechazarCotizacionDto,
  EjecutarCotizacionDto,
} from './dto/cotizacion.dto';

@ApiTags('cotizaciones')
@Controller('api/cotizaciones')
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las cotizaciones' })
  @ApiQuery({ name: 'estado', required: false, description: 'Filtrar por estado (solicitando_proformas, comparando, pendiente_aprobacion, aprobada, rechazada, ejecutada)' })
  @ApiResponse({ status: 200, description: 'Lista de cotizaciones' })
  findAll(@Query('estado') estado?: string) {
    return this.cotizacionesService.findAll(estado);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Cargar cotizaciones de prueba (seed) — idempotente' })
  @ApiResponse({ status: 201, description: 'Seed ejecutado. Retorna { cotizaciones, mensaje }' })
  seedData() {
    return this.cotizacionesService.seedData();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una cotización por ID' })
  @ApiParam({ name: 'id', description: 'ID de la cotización', example: 'COT-001' })
  @ApiResponse({ status: 200, description: 'Cotización encontrada' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  findOne(@Param('id') id: string) {
    return this.cotizacionesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva cotización' })
  @ApiResponse({ status: 201, description: 'Cotización creada' })
  create(@Body() dto: CreateCotizacionDto) {
    return this.cotizacionesService.create(dto);
  }

  @Patch(':id/proforma')
  @ApiOperation({ summary: 'Agregar proforma a una cotización' })
  @ApiParam({ name: 'id', description: 'ID de la cotización', example: 'COT-002' })
  @ApiResponse({ status: 200, description: 'Proforma agregada. Si hay ≥ 3, estado cambia a comparando' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  addProforma(@Param('id') id: string, @Body() dto: AddProformaDto) {
    return this.cotizacionesService.addProforma(id, dto);
  }

  @Patch(':id/seleccionar')
  @ApiOperation({ summary: 'Seleccionar proforma ganadora' })
  @ApiParam({ name: 'id', description: 'ID de la cotización', example: 'COT-001' })
  @ApiResponse({ status: 200, description: 'Proforma seleccionada. Estado cambia a pendiente_aprobacion' })
  @ApiResponse({ status: 400, description: 'Índice de proforma fuera de rango' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  seleccionar(@Param('id') id: string, @Body() dto: SeleccionarProformaDto) {
    return this.cotizacionesService.seleccionar(id, dto);
  }

  @Patch(':id/aprobar')
  @ApiOperation({ summary: 'Aprobar cotización (gerencia)' })
  @ApiParam({ name: 'id', description: 'ID de la cotización', example: 'COT-001' })
  @ApiResponse({ status: 200, description: 'Cotización aprobada. Calcula tiempoRespuestaGerencia' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  aprobar(@Param('id') id: string, @Body() dto: AprobarCotizacionDto) {
    return this.cotizacionesService.aprobar(id, dto);
  }

  @Patch(':id/rechazar')
  @ApiOperation({ summary: 'Rechazar cotización' })
  @ApiParam({ name: 'id', description: 'ID de la cotización', example: 'COT-001' })
  @ApiResponse({ status: 200, description: 'Cotización rechazada' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  rechazar(@Param('id') id: string, @Body() dto: RechazarCotizacionDto) {
    return this.cotizacionesService.rechazar(id, dto);
  }

  @Patch(':id/ejecutar')
  @ApiOperation({ summary: 'Registrar ejecución de cotización aprobada' })
  @ApiParam({ name: 'id', description: 'ID de la cotización', example: 'COT-001' })
  @ApiResponse({ status: 200, description: 'Cotización marcada como ejecutada con costo final' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  ejecutar(@Param('id') id: string, @Body() dto: EjecutarCotizacionDto) {
    return this.cotizacionesService.ejecutar(id, dto);
  }
}
