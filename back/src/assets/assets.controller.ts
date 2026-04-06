import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { StorageService } from './storage.service';
import { CreateActivoDto } from './dto/create-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';
import { TransferirActivoDto } from './dto/transferir-activo.dto';
import { BuscarActivoDto } from './dto/buscar-activo.dto';
import { FiltrosActivoDto } from './dto/filtros-activo.dto';

@ApiTags('activos')
@Controller('api/activos')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los activos del inventario' })
  @ApiResponse({ status: 200, description: 'Lista completa de activos' })
  findAll() {
    return this.assetsService.findAll();
  }

  @Get('buscar')
  @ApiOperation({ summary: 'Buscar activos por texto y/o filtros' })
  @ApiQuery({ name: 'q', required: false, description: 'Texto libre (nombre, tipo, serial, placa, marca)' })
  @ApiQuery({ name: 'tipo', required: false, description: 'Filtrar por tipo exacto' })
  @ApiQuery({ name: 'estado', required: false, description: 'Filtrar por estado (activo, en-reparacion, etc.)' })
  @ApiQuery({ name: 'estadoOperativo', required: false, description: 'Filtrar por estado operativo (disponible, en-prestamo, etc.)' })
  @ApiQuery({ name: 'areaId', required: false, description: 'Filtrar por área' })
  @ApiResponse({ status: 200, description: 'Lista de activos que coinciden con los filtros' })
  buscar(
    @Query() buscarDto: BuscarActivoDto,
    @Query() filtrosDto: FiltrosActivoDto,
  ) {
    return this.assetsService.search(buscarDto, filtrosDto);
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Obtener estadísticas globales del inventario' })
  @ApiResponse({ status: 200, description: 'Estadísticas: total, disponibles, en préstamo, en mantenimiento, etc.' })
  estadisticas() {
    return this.assetsService.getEstadisticas();
  }

  @Post('seed')
  @ApiOperation({ summary: 'Cargar inventario inicial (seed) — idempotente' })
  @ApiResponse({ status: 201, description: 'Seed ejecutado. Retorna { activos, mensaje }' })
  @ApiResponse({ status: 201, description: 'Si ya existen datos, retorna conteo sin insertar nada' })
  seed() {
    return this.assetsService.seedData();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un activo por ID' })
  @ApiParam({ name: 'id', description: 'ID del activo', example: 'A001' })
  @ApiResponse({ status: 200, description: 'Activo encontrado' })
  @ApiResponse({ status: 404, description: 'Activo no encontrado' })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Get(':id/disponibilidad')
  @ApiOperation({ summary: 'Consultar disponibilidad en tiempo real de un activo' })
  @ApiParam({ name: 'id', description: 'ID del activo', example: 'A001' })
  @ApiResponse({ status: 200, description: 'Estado de disponibilidad del activo' })
  disponibilidad(@Param('id') id: string) {
    return this.assetsService.getDisponibilidad(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar nuevo activo en el inventario' })
  @ApiBody({ type: CreateActivoDto })
  @ApiResponse({ status: 201, description: 'Activo creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Ubicación ya ocupada por otro equipo' })
  create(@Body() createActivoDto: CreateActivoDto) {
    return this.assetsService.create(createActivoDto, 'demo-user');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de un activo' })
  @ApiParam({ name: 'id', description: 'ID del activo', example: 'A001' })
  @ApiBody({ type: UpdateActivoDto })
  @ApiResponse({ status: 200, description: 'Activo actualizado' })
  @ApiResponse({ status: 404, description: 'Activo no encontrado' })
  update(@Param('id') id: string, @Body() updateActivoDto: UpdateActivoDto) {
    return this.assetsService.update(id, updateActivoDto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar un activo del inventario' })
  @ApiParam({ name: 'id', description: 'ID del activo', example: 'A001' })
  @ApiResponse({ status: 204, description: 'Activo eliminado' })
  @ApiResponse({ status: 404, description: 'Activo no encontrado' })
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }

  @Post(':id/transferir')
  @ApiOperation({ summary: 'Transferir custodia de un activo a nueva ubicación' })
  @ApiParam({ name: 'id', description: 'ID del activo', example: 'A001' })
  @ApiBody({ type: TransferirActivoDto })
  @ApiResponse({ status: 201, description: 'Transferencia registrada y activo actualizado' })
  @ApiResponse({ status: 404, description: 'Activo no encontrado' })
  transferir(
    @Param('id') id: string,
    @Body() transferirDto: TransferirActivoDto,
  ) {
    return this.assetsService.transferir(id, transferirDto, 'demo-user', 'Usuario Demo');
  }

  @Get(':id/movimientos')
  @ApiOperation({ summary: 'Obtener historial de movimientos de un activo' })
  @ApiParam({ name: 'id', description: 'ID del activo', example: 'A001' })
  @ApiResponse({ status: 200, description: 'Lista de movimientos ordenados por fecha DESC' })
  getMovimientos(@Param('id') id: string) {
    return this.assetsService.getMovimientos(id);
  }

  @Post(':id/imagen')
  @ApiOperation({ summary: 'Subir o reemplazar la foto del activo a Firebase Storage' })
  @ApiParam({ name: 'id', description: 'ID del activo', example: 'A001' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Imagen JPG, PNG, WEBP o GIF (máx 5 MB)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Imagen subida. Retorna { imagenUrl }' })
  @ApiResponse({ status: 400, description: 'Formato inválido o archivo demasiado grande' })
  @ApiResponse({ status: 404, description: 'Activo no encontrado' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadImagen(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');

    // Si el activo ya existe, limpiar imagen anterior (para activos editados)
    try {
      const activo = await this.assetsService.findOne(id);
      if (activo.imagenUrl && !activo.imagenUrl.includes('placehold.co')) {
        await this.storageService.deleteFile(activo.imagenUrl);
      }
      // Si ya existe, actualizar imagenUrl en Firestore
      const imagenUrl = await this.storageService.uploadActivoImagen(id, file);
      await this.assetsService.update(id, { imagenUrl });
      return { imagenUrl };
    } catch (err: any) {
      // Activo nuevo (aún no guardado en Firestore) — solo subir a R2 y devolver URL
      // El activo se creará después con imagenUrl ya incluido en el body
      if (err?.status === 404 || err?.name === 'NotFoundException') {
        const imagenUrl = await this.storageService.uploadActivoImagen(id, file);
        return { imagenUrl };
      }
      throw err;
    }
  }
}
