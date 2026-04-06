import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service';
import { CreateCatalogoItemDto, UpdateCatalogoItemDto } from './dto/create-catalogo-item.dto';

@ApiTags('catalogos')
@Controller('api/catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar items de catálogo (filtrable por tipo y parentId)' })
  @ApiQuery({ name: 'catalogo', required: false, enum: ['marca', 'modelo', 'tipo-activo', 'proveedor'] })
  @ApiQuery({ name: 'parentId', required: false, description: 'ID de marca padre (para modelos)' })
  @ApiResponse({ status: 200, description: 'Lista de items del catálogo' })
  findAll(
    @Query('catalogo') catalogo?: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.catalogosService.findAll(catalogo, parentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un item de catálogo por ID' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.catalogosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un item de catálogo' })
  @ApiResponse({ status: 201, description: 'Item creado' })
  create(@Body() dto: CreateCatalogoItemDto) {
    return this.catalogosService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un item de catálogo' })
  @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateCatalogoItemDto) {
    return this.catalogosService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un item de catálogo' })
  @ApiParam({ name: 'id' })
  remove(@Param('id') id: string) {
    return this.catalogosService.remove(id);
  }
}
