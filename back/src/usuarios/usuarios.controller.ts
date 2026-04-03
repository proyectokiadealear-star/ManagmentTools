import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiParam,
  ApiQuery, ApiResponse, ApiBody,
} from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Sede } from '../common/enums/sede.enum';
import { AreaTaller } from '../common/enums/area-taller.enum';

@ApiTags('usuarios')
@Controller('api/usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // ─── Listados ────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar todos los usuarios del sistema' })
  @ApiQuery({ name: 'sede', enum: Sede, required: false, description: 'Filtrar por sede' })
  @ApiQuery({ name: 'area', enum: AreaTaller, required: false, description: 'Filtrar por área' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async findAll(
    @Query('sede') sede?: Sede,
    @Query('area') area?: AreaTaller,
  ) {
    if (sede) return this.usuariosService.findBySede(sede);
    if (area) return this.usuariosService.findByArea(area);
    return this.usuariosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  // ─── Creación ────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo usuario',
    description:
      'Crea el usuario en Firestore. Cuando se integre Firebase Authentication, ' +
      'aquí también se llamará a createUser() y el UID resultante se guardará en `uid`.',
  })
  @ApiBody({ type: CreateUsuarioDto })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  // ─── Actualización ────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de un usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiBody({ type: UpdateUsuarioDto })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, dto);
  }

  // ─── Activar / Desactivar ─────────────────────────────────────────────────────

  @Patch(':id/desactivar')
  @ApiOperation({
    summary: 'Desactivar un usuario',
    description:
      'Marca activo=false. En producción con Firebase Auth, también llamará a disableUser(uid).',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado' })
  desactivar(@Param('id') id: string) {
    return this.usuariosService.desactivar(id);
  }

  @Patch(':id/activar')
  @ApiOperation({
    summary: 'Reactivar un usuario desactivado',
    description:
      'Marca activo=true. En producción con Firebase Auth, también llamará a enableUser(uid).',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario reactivado' })
  activar(@Param('id') id: string) {
    return this.usuariosService.activar(id);
  }

  // ─── Eliminación ─────────────────────────────────────────────────────────────

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un usuario permanentemente',
    description:
      'Elimina el documento de Firestore. En producción con Firebase Auth, ' +
      'también llamará a deleteUser(uid) para revocar el acceso de autenticación.',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }

  // ─── Seed ─────────────────────────────────────────────────────────────────────

  @Post('seed')
  @ApiOperation({ summary: 'Cargar usuarios de ejemplo — idempotente' })
  @ApiResponse({ status: 201, description: 'Seed ejecutado' })
  seed() {
    return this.usuariosService.seedData(false);
  }

  @Post('reset-seed')
  @ApiOperation({ summary: 'DESARROLLO: borra todos los usuarios y re-seedea desde cero' })
  @ApiResponse({ status: 201, description: 'Reset + seed ejecutado' })
  resetSeed() {
    return this.usuariosService.resetAndSeed();
  }
}
