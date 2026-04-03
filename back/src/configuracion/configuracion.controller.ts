import { Controller, Get, Patch, Post, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ConfiguracionService } from './configuracion.service';
import { AreaConfigDto, UpdateAreaDto } from './dto/area-config.dto';
import { GeneralConfigDto, UpdateGeneralConfigDto } from './dto/general-config.dto';

@ApiTags('configuracion')
@Controller('api/configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  // ─── Areas ──────────────────────────────────────────────────────────────────

  @Get('areas')
  @ApiOperation({ summary: 'Obtener configuración de todas las áreas del taller' })
  @ApiResponse({ status: 200, description: 'Lista de áreas con bahías y colores', type: [AreaConfigDto] })
  getAreas(): Promise<AreaConfigDto[]> {
    return this.configuracionService.getAreas();
  }

  @Patch('areas/:areaId')
  @ApiOperation({ summary: 'Actualizar configuración de un área (nombre, color, bahías)' })
  @ApiParam({ name: 'areaId', description: 'ID del área', example: 'TALLER' })
  @ApiBody({ type: UpdateAreaDto })
  @ApiResponse({ status: 200, description: 'Lista actualizada de áreas', type: [AreaConfigDto] })
  @ApiResponse({ status: 404, description: 'Área no encontrada' })
  updateArea(
    @Param('areaId') areaId: string,
    @Body() updateDto: UpdateAreaDto,
  ): Promise<AreaConfigDto[]> {
    return this.configuracionService.updateArea(areaId, updateDto);
  }

  // ─── General ────────────────────────────────────────────────────────────────

  @Get('general')
  @ApiOperation({ summary: 'Obtener configuración general del taller' })
  @ApiResponse({ status: 200, description: 'Configuración general (umbrales, tolerancias, EPI frecuencias)', type: GeneralConfigDto })
  getGeneral(): Promise<GeneralConfigDto> {
    return this.configuracionService.getGeneral();
  }

  @Patch('general')
  @ApiOperation({ summary: 'Actualizar configuración general (merge parcial)' })
  @ApiBody({ type: UpdateGeneralConfigDto })
  @ApiResponse({ status: 200, description: 'Configuración general actualizada', type: GeneralConfigDto })
  updateGeneral(@Body() updateDto: UpdateGeneralConfigDto): Promise<GeneralConfigDto> {
    return this.configuracionService.updateGeneral(updateDto);
  }

  // ─── Seed ───────────────────────────────────────────────────────────────────

  @Post('seed')
  @ApiOperation({ summary: 'Sembrar configuración por defecto (áreas + general)' })
  @ApiResponse({ status: 201, description: 'Configuración sembrada exitosamente' })
  seed(): Promise<{ mensaje: string }> {
    return this.configuracionService.seedAll();
  }
}
