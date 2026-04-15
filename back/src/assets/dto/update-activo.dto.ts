import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { CreateActivoDto } from './create-activo.dto';

export class UpdateActivoDto extends PartialType(CreateActivoDto) {
  @ApiPropertyOptional({
    example: 'SURMOTOR',
    description: 'Sede opcional legacy/informativa. Si cambia areaId, el backend recalcula y persiste la sede derivada.',
  })
  @IsOptional()
  @IsString()
  sede?: string;

  @ApiPropertyOptional({
    enum: ['disponible', 'en-prestamo', 'en-mantenimiento', 'danado'],
    example: 'disponible',
    description: 'Estado operativo del activo',
  })
  @IsOptional()
  @IsEnum(['disponible', 'en-prestamo', 'en-mantenimiento', 'danado'])
  estadoOperativo?: string;

  @ApiPropertyOptional({ example: 'Datos técnicos libres', description: 'Especificaciones técnicas (legacy)' })
  @IsOptional()
  @IsString()
  especificaciones?: string;

  @ApiPropertyOptional({ example: '3.5 toneladas', description: 'Capacidad del activo (legacy)' })
  @IsOptional()
  @IsString()
  capacidad?: string;

  @ApiPropertyOptional({ example: 1800.0, description: 'Valor depreciado actual' })
  @IsOptional()
  @IsNumber()
  valorActual?: number;
}
