import { IsString, IsOptional, IsEnum, IsNumber, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── CreateInspeccionDto ───────────────────────────────────────────────────────
export class CreateInspeccionDto {
  @ApiProperty({ example: 'area-taller', description: 'ID del área a inspeccionar' })
  @IsString()
  areaId: string;

  @ApiProperty({ example: 'Taller Mecánico', description: 'Nombre del área' })
  @IsString()
  areaNombre: string;

  @ApiProperty({ example: 'caja-005', description: 'ID de la caja a inspeccionar' })
  @IsString()
  cajaId: string;

  @ApiProperty({ example: 'Caja-005 de Luis Gómez', description: 'Nombre descriptivo de la caja' })
  @IsString()
  cajaNombre: string;

  @ApiProperty({ example: 'usr-tech-01', description: 'ID del técnico responsable de la caja' })
  @IsString()
  tecnicoResponsableId: string;

  @ApiProperty({ example: 'Luis Gómez', description: 'Nombre del técnico responsable' })
  @IsString()
  tecnicoResponsableNombre: string;

  @ApiProperty({ example: 'usr-insp-01', description: 'ID del inspector asignado' })
  @IsString()
  inspectorId: string;

  @ApiProperty({ example: 'Carlos Mendoza', description: 'Nombre del inspector asignado' })
  @IsString()
  inspectorNombre: string;

  @ApiProperty({ example: '2025-07-15', description: 'Fecha programada para la inspección (ISO 8601)' })
  @IsString()
  fechaProgramada: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/foto-base.jpg', description: 'URL de la foto de referencia' })
  @IsOptional()
  @IsString()
  fotoBaseUrl?: string;
}

// ─── AgregarFotoDto ────────────────────────────────────────────────────────────
export class AgregarFotoDto {
  @ApiProperty({ example: 'https://storage.example.com/foto-nueva.jpg', description: 'URL de la foto capturada' })
  @IsString()
  url: string;

  @ApiProperty({ enum: ['frontal', 'superior', 'detalle'], example: 'frontal', description: 'Ángulo de la foto' })
  @IsEnum(['frontal', 'superior', 'detalle'])
  angulo: 'frontal' | 'superior' | 'detalle';
}

// ─── AgregarDiscrepanciaDto ────────────────────────────────────────────────────
export class AgregarDiscrepanciaDto {
  @ApiProperty({ example: 'Llave torx T25 no se encuentra en su posición', description: 'Descripción de la discrepancia' })
  @IsString()
  descripcion: string;

  @ApiProperty({
    enum: ['herramienta_ausente', 'herramienta_nueva', 'herramienta_movida', 'otro'],
    example: 'herramienta_ausente',
    description: 'Tipo de discrepancia detectada',
  })
  @IsEnum(['herramienta_ausente', 'herramienta_nueva', 'herramienta_movida', 'otro'])
  tipo: 'herramienta_ausente' | 'herramienta_nueva' | 'herramienta_movida' | 'otro';

  @ApiPropertyOptional({ example: 'Llave Torx T25', description: 'Herramienta afectada por la discrepancia' })
  @IsOptional()
  @IsString()
  herramientaAfectada?: string;

  @ApiPropertyOptional({ example: '2025-07-01', description: 'Última vez que se confirmó la herramienta en su lugar' })
  @IsOptional()
  @IsString()
  ultimaVezConfirmada?: string;
}

// ─── ResolverDiscrepanciaDto ───────────────────────────────────────────────────
export class ResolverDiscrepanciaDto {
  @ApiProperty({ example: 0, description: 'Índice de la discrepancia en el array (0-based)' })
  @IsNumber()
  discrepanciaIdx: number;

  @ApiProperty({
    enum: ['falsa_alarma', 'falta_confirmada', 'herramienta_nueva', 'investigacion'],
    example: 'falta_confirmada',
    description: 'Resultado de la investigación de la discrepancia',
  })
  @IsEnum(['falsa_alarma', 'falta_confirmada', 'herramienta_nueva', 'investigacion'])
  resultado: 'falsa_alarma' | 'falta_confirmada' | 'herramienta_nueva' | 'investigacion';

  @ApiPropertyOptional({ example: 'Herramienta fue prestada sin registro', description: 'Observación adicional sobre la resolución' })
  @IsOptional()
  @IsString()
  observacion?: string;
}

// ─── CompletarInspeccionDto ────────────────────────────────────────────────────
export class CompletarInspeccionDto {
  @ApiPropertyOptional({ example: 'Caja en buen estado general, una herramienta pendiente de devolución', description: 'Observaciones generales al completar' })
  @IsOptional()
  @IsString()
  observacionesGenerales?: string;
}
