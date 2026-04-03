import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { RepararVsReemplazarDto } from './dto/reparar-vs-reemplazar.dto';
import {
  DepreciacionActivoDto,
  DepreciacionBulkResponseDto,
  RepararVsReemplazarResponseDto,
} from './dto/depreciacion-response.dto';

@ApiTags('finanzas')
@Controller('api/finanzas')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('depreciacion')
  @ApiOperation({ summary: 'Obtener depreciación de todos los activos con resumen' })
  @ApiResponse({ status: 200, description: 'Lista de depreciaciones + totales', type: DepreciacionBulkResponseDto })
  getDepreciacionBulk(): Promise<DepreciacionBulkResponseDto> {
    return this.financeService.getDepreciacionBulk();
  }

  @Get('depreciacion/:activoId')
  @ApiOperation({ summary: 'Calcular depreciación para un activo específico' })
  @ApiParam({ name: 'activoId', description: 'ID del activo', example: 'A001' })
  @ApiResponse({ status: 200, description: 'Datos de depreciación del activo', type: DepreciacionActivoDto })
  @ApiResponse({ status: 404, description: 'Activo no encontrado' })
  getDepreciacionByActivo(@Param('activoId') activoId: string): Promise<DepreciacionActivoDto> {
    return this.financeService.getDepreciacionByActivo(activoId);
  }

  @Post('reparar-vs-reemplazar')
  @ApiOperation({ summary: 'Evaluar si conviene reparar o reemplazar un activo' })
  @ApiBody({ type: RepararVsReemplazarDto })
  @ApiResponse({ status: 201, description: 'Análisis reparar vs reemplazar', type: RepararVsReemplazarResponseDto })
  @ApiResponse({ status: 404, description: 'Activo no encontrado' })
  evaluarRepararVsReemplazar(
    @Body() dto: RepararVsReemplazarDto,
  ): Promise<RepararVsReemplazarResponseDto> {
    return this.financeService.evaluarRepararVsReemplazar(dto);
  }

  @Get('activos-por-depreciar')
  @ApiOperation({ summary: 'Obtener activos con depreciación >= 80%' })
  @ApiResponse({ status: 200, description: 'Activos próximos a depreciación total', type: [DepreciacionActivoDto] })
  getActivosPorDepreciar(): Promise<DepreciacionActivoDto[]> {
    return this.financeService.getActivosPorDepreciar();
  }
}
