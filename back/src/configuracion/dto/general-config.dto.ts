import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsObject } from 'class-validator';

export class UmbralReparacionDto {
  @ApiProperty({ example: 0.3, description: 'Umbral verde (reparar sin duda)' })
  verde: number;

  @ApiProperty({ example: 0.5, description: 'Umbral amarillo (evaluar)' })
  amarillo: number;

  @ApiProperty({ example: 1.0, description: 'Umbral rojo (reemplazar)' })
  rojo: number;
}

export class DiasAlertaMantenimientoDto {
  @ApiProperty({ example: 30, description: 'Días para alerta verde' })
  verde: number;

  @ApiProperty({ example: 15, description: 'Días para alerta amarilla' })
  amarillo: number;

  @ApiProperty({ example: 7, description: 'Días para alerta naranja' })
  naranja: number;

  @ApiProperty({ example: 0, description: 'Días para alerta roja (vencido)' })
  rojo: number;
}

export class GeneralConfigDto {
  @ApiProperty({ type: UmbralReparacionDto })
  umbralReparacion: UmbralReparacionDto;

  @ApiProperty({ type: DiasAlertaMantenimientoDto })
  diasAlertaMantenimiento: DiasAlertaMantenimientoDto;

  @ApiProperty({ example: 5242880, description: 'Tamaño máximo de imagen en bytes (5MB)' })
  maxTamanoImagen: number;

  @ApiProperty({ example: '$', description: 'Símbolo de moneda' })
  monedaSimbolo: string;

  @ApiProperty({ example: 0.2, description: 'Tolerancia de consumo (20%)' })
  toleranciaConsumo: number;

  @ApiProperty({
    example: { 'guantes-nitrilo': 30, 'mascarilla-n95': 90, 'gafas-seguridad': 180, 'botas-seguridad': 365 },
    description: 'Frecuencia de reposición de EPIs en días',
  })
  epiFrecuencias: Record<string, number>;
}

export class UpdateGeneralConfigDto {
  @ApiPropertyOptional({ type: UmbralReparacionDto })
  @IsOptional()
  @IsObject()
  umbralReparacion?: UmbralReparacionDto;

  @ApiPropertyOptional({ type: DiasAlertaMantenimientoDto })
  @IsOptional()
  @IsObject()
  diasAlertaMantenimiento?: DiasAlertaMantenimientoDto;

  @ApiPropertyOptional({ example: 5242880 })
  @IsOptional()
  @IsNumber()
  maxTamanoImagen?: number;

  @ApiPropertyOptional({ example: '$' })
  @IsOptional()
  @IsString()
  monedaSimbolo?: string;

  @ApiPropertyOptional({ example: 0.2 })
  @IsOptional()
  @IsNumber()
  toleranciaConsumo?: number;

  @ApiPropertyOptional({
    example: { 'guantes-nitrilo': 30, 'mascarilla-n95': 90 },
  })
  @IsOptional()
  @IsObject()
  epiFrecuencias?: Record<string, number>;
}
