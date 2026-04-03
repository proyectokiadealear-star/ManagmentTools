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
import { PrestamosService } from './prestamos.service';
import {
  CreatePrestamoDto,
  AprobarPrestamoDto,
  RechazarPrestamoDto,
  RegistrarRetiroDto,
  RegistrarDevolucionDto,
  RegistrarDanoDto,
} from './dto/prestamo.dto';

@ApiTags('prestamos')
@Controller('api/prestamos')
export class PrestamosController {
  constructor(private readonly prestamosService: PrestamosService) {}

  // ─── Consultas ────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Obtener todos los préstamos (opcionalmente filtrar por estado)' })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['pendiente', 'aprobado', 'en_uso', 'devuelto', 'devuelto_con_dano', 'vencido', 'rechazado'],
    description: 'Filtrar préstamos por estado',
  })
  @ApiResponse({ status: 200, description: 'Lista de préstamos' })
  findAll(@Query('estado') estado?: string) {
    return this.prestamosService.findAll(estado);
  }

  @Get('herramienta/:herramientaId')
  @ApiOperation({ summary: 'Obtener préstamos por herramienta' })
  @ApiParam({ name: 'herramientaId', description: 'ID de la herramienta', example: 'A003' })
  @ApiResponse({ status: 200, description: 'Lista de préstamos de la herramienta' })
  findByHerramienta(@Param('herramientaId') herramientaId: string) {
    return this.prestamosService.findByHerramienta(herramientaId);
  }

  @Get('solicitante/:solicitanteId')
  @ApiOperation({ summary: 'Obtener préstamos por solicitante' })
  @ApiParam({ name: 'solicitanteId', description: 'ID del solicitante', example: 'user-003' })
  @ApiResponse({ status: 200, description: 'Lista de préstamos del solicitante' })
  findBySolicitante(@Param('solicitanteId') solicitanteId: string) {
    return this.prestamosService.findBySolicitante(solicitanteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un préstamo por ID' })
  @ApiParam({ name: 'id', description: 'ID del préstamo', example: 'PREST-001' })
  @ApiResponse({ status: 200, description: 'Préstamo encontrado' })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  findOne(@Param('id') id: string) {
    return this.prestamosService.findOne(id);
  }

  @Get(':id/acta/:tipo')
  @ApiOperation({ summary: 'Obtener acta de salida o devolución de un préstamo' })
  @ApiParam({ name: 'id', description: 'ID del préstamo', example: 'PREST-001' })
  @ApiParam({ name: 'tipo', enum: ['salida', 'devolucion'], description: 'Tipo de acta' })
  @ApiResponse({ status: 200, description: 'Acta encontrada' })
  @ApiResponse({ status: 404, description: 'Acta no encontrada' })
  getActa(
    @Param('id') id: string,
    @Param('tipo') tipo: 'salida' | 'devolucion',
  ) {
    return this.prestamosService.getActa(id, tipo);
  }

  // ─── Acciones ─────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Solicitar un nuevo préstamo de herramienta' })
  @ApiBody({ type: CreatePrestamoDto })
  @ApiResponse({ status: 201, description: 'Préstamo creado en estado pendiente' })
  create(@Body() dto: CreatePrestamoDto) {
    return this.prestamosService.create(dto);
  }

  @Patch(':id/aprobar')
  @ApiOperation({ summary: 'Aprobar un préstamo pendiente' })
  @ApiParam({ name: 'id', description: 'ID del préstamo', example: 'PREST-002' })
  @ApiBody({ type: AprobarPrestamoDto })
  @ApiResponse({ status: 200, description: 'Préstamo aprobado' })
  @ApiResponse({ status: 400, description: 'Estado no permite aprobación' })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  aprobar(@Param('id') id: string, @Body() dto: AprobarPrestamoDto) {
    return this.prestamosService.aprobar(id, dto);
  }

  @Patch(':id/rechazar')
  @ApiOperation({ summary: 'Rechazar un préstamo pendiente' })
  @ApiParam({ name: 'id', description: 'ID del préstamo', example: 'PREST-002' })
  @ApiBody({ type: RechazarPrestamoDto })
  @ApiResponse({ status: 200, description: 'Préstamo rechazado' })
  @ApiResponse({ status: 400, description: 'Estado no permite rechazo' })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  rechazar(@Param('id') id: string, @Body() dto: RechazarPrestamoDto) {
    return this.prestamosService.rechazar(id, dto);
  }

  @Patch(':id/retiro')
  @ApiOperation({ summary: 'Registrar retiro de herramienta (genera acta de salida)' })
  @ApiParam({ name: 'id', description: 'ID del préstamo', example: 'PREST-001' })
  @ApiBody({ type: RegistrarRetiroDto })
  @ApiResponse({ status: 200, description: 'Retiro registrado, acta generada' })
  @ApiResponse({ status: 400, description: 'Estado no permite retiro' })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  registrarRetiro(@Param('id') id: string, @Body() _dto: RegistrarRetiroDto) {
    return this.prestamosService.registrarRetiro(id);
  }

  @Patch(':id/devolucion')
  @ApiOperation({ summary: 'Registrar devolución de herramienta (genera acta de devolución)' })
  @ApiParam({ name: 'id', description: 'ID del préstamo', example: 'PREST-001' })
  @ApiBody({ type: RegistrarDevolucionDto })
  @ApiResponse({ status: 200, description: 'Devolución registrada, acta generada' })
  @ApiResponse({ status: 400, description: 'Estado no permite devolución' })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  registrarDevolucion(@Param('id') id: string, @Body() dto: RegistrarDevolucionDto) {
    return this.prestamosService.registrarDevolucion(id, dto);
  }

  @Patch(':id/dano')
  @ApiOperation({ summary: 'Registrar daño y sanción en un préstamo devuelto con daño' })
  @ApiParam({ name: 'id', description: 'ID del préstamo', example: 'PREST-001' })
  @ApiBody({ type: RegistrarDanoDto })
  @ApiResponse({ status: 200, description: 'Daño y sanción registrados' })
  @ApiResponse({ status: 400, description: 'Estado no permite registro de daño' })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  registrarDano(@Param('id') id: string, @Body() dto: RegistrarDanoDto) {
    return this.prestamosService.registrarDano(id, dto);
  }

  @Patch(':id/cerrar')
  @ApiOperation({ summary: 'Cerrar un préstamo (marcar como finalizado)' })
  @ApiParam({ name: 'id', description: 'ID del préstamo', example: 'PREST-003' })
  @ApiResponse({ status: 200, description: 'Préstamo cerrado' })
  @ApiResponse({ status: 400, description: 'Estado no permite cierre' })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  cerrar(@Param('id') id: string) {
    return this.prestamosService.cerrar(id);
  }

  // ─── Seed ─────────────────────────────────────────────────────────────────────

  @Post('seed')
  @ApiOperation({ summary: 'Cargar préstamos de ejemplo (seed) — idempotente' })
  @ApiResponse({ status: 201, description: 'Seed ejecutado' })
  seed() {
    return this.prestamosService.seedData();
  }
}
