import { ApiProperty } from '@nestjs/swagger';

export class DepreciacionActivoDto {
  @ApiProperty({ example: 'A001' })
  activoId: string;

  @ApiProperty({ example: 'Scanner Automotriz GDS' })
  nombre: string;

  @ApiProperty({ example: 2500 })
  valorOriginal: number;

  @ApiProperty({ example: 5 })
  vidaUtilAnios: number;

  @ApiProperty({ example: 3 })
  aniosTranscurridos: number;

  @ApiProperty({ example: 500 })
  depreciacionAnual: number;

  @ApiProperty({ example: 1500 })
  depreciacionAcumulada: number;

  @ApiProperty({ example: 1000 })
  valorActual: number;

  @ApiProperty({ example: 60 })
  porcentajeDepreciado: number;

  @ApiProperty({ example: '2022-10-28' })
  fechaCompra: string;
}

export class DepreciacionBulkResponseDto {
  @ApiProperty({ type: [DepreciacionActivoDto] })
  activos: DepreciacionActivoDto[];

  @ApiProperty({ example: 50000 })
  totalValorOriginal: number;

  @ApiProperty({ example: 30000 })
  totalValorActual: number;

  @ApiProperty({ example: 20000 })
  totalDepreciacionAcumulada: number;
}

export class RepararVsReemplazarResponseDto {
  @ApiProperty({ example: 'A001' })
  activoId: string;

  @ApiProperty({ example: 'Scanner Automotriz GDS' })
  nombre: string;

  @ApiProperty({ example: 1000 })
  valorActual: number;

  @ApiProperty({ example: 350 })
  costoReparacion: number;

  @ApiProperty({ example: 2500 })
  costoReemplazo: number;

  @ApiProperty({ example: 35, description: 'Porcentaje del costo de reparación vs valor actual depreciado' })
  porcentajeReparacionVsValor: number;

  @ApiProperty({ enum: ['reparar', 'evaluar_reemplazo', 'reemplazar', 'reemplazar_definitivo'] })
  recomendacion: 'reparar' | 'evaluar_reemplazo' | 'reemplazar' | 'reemplazar_definitivo';

  @ApiProperty({ enum: ['verde', 'amarillo', 'rojo'] })
  alertaNivel: 'verde' | 'amarillo' | 'rojo';

  @ApiProperty({ example: 'Costo de reparación razonable respecto al valor actual.' })
  razon: string;
}
