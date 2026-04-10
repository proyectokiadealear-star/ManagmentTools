import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('api/dashboard/activos')
  @ApiOperation({
    summary: 'KPIs de flota — TCO, disponibilidad por área y flota depreciada',
  })
  @ApiResponse({ status: 200, description: 'KPIs calculados sobre activos, mantenimientos y fallas' })
  getDashboardActivos() {
    return this.dashboardService.getDashboardActivos();
  }

  @Get('api/dashboard/mantenimiento')
  @ApiOperation({
    summary: 'KPIs de mantenimiento — ratio preventivo/correctivo y cumplimiento de programación',
  })
  @ApiResponse({ status: 200, description: 'Breakdown por tipo, costos y semáforos de programación' })
  getDashboardMantenimiento() {
    return this.dashboardService.getDashboardMantenimiento();
  }

  @Get('api/dashboard/fallas')
  @ApiOperation({
    summary: 'KPIs de fallas — MTBF, ranking de activos problemáticos y tiempo de respuesta gerencial',
  })
  @ApiResponse({ status: 200, description: 'Métricas de confiabilidad y costos de falla' })
  getDashboardFallas() {
    return this.dashboardService.getDashboardFallas();
  }

  @Get('api/dashboard/prestamos')
  @ApiOperation({
    summary: 'KPIs de préstamos — demanda por herramienta y técnicos con mayor índice de daño',
  })
  @ApiResponse({ status: 200, description: 'Utilización de herramientas y trazabilidad de daños' })
  getDashboardPrestamos() {
    return this.dashboardService.getDashboardPrestamos();
  }
}
