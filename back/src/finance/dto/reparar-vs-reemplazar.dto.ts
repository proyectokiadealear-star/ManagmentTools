import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RepararVsReemplazarDto {
  @ApiProperty({ example: 'A001', description: 'ID del activo a evaluar' })
  @IsString()
  activoId: string;

  @ApiProperty({ example: 350, description: 'Costo estimado de la reparación ($)' })
  @IsNumber()
  costoReparacion: number;

  @ApiPropertyOptional({ example: 2500, description: 'Costo de un reemplazo nuevo ($). Si no se envía, se usa el valor original del activo.' })
  @IsOptional()
  @IsNumber()
  costoReemplazo?: number;
}
