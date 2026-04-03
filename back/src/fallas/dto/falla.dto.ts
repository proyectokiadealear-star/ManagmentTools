import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFallaDto {
  @ApiProperty({ example: 'A005', description: 'ID del activo afectado' })
  @IsString()
  activoId: string;

  @ApiProperty({ example: 'Alineadora 3D HawkEye', description: 'Nombre del activo' })
  @IsString()
  activoNombre: string;

  @ApiProperty({ example: 'Sensor delantero con lecturas inconsistentes ±3mm', description: 'Descripción de los síntomas' })
  @IsString()
  descripcionSintomas: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/foto-falla.jpg', description: 'URL de fotografía' })
  @IsOptional()
  @IsString()
  fotografiaUrl?: string;

  @ApiProperty({ example: 'No se pueden realizar alineaciones — servicio detenido', description: 'Impacto operativo' })
  @IsString()
  impactoOperativo: string;

  @ApiProperty({ example: 'user-003', description: 'ID de quien reporta' })
  @IsString()
  reportadoPor: string;

  @ApiProperty({ example: 'Miguel Sánchez', description: 'Nombre de quien reporta' })
  @IsString()
  reportadoPorNombre: string;

  @ApiProperty({ example: '2025-02-05', description: 'Fecha en que se detectó la falla (ISO)' })
  @IsString()
  fechaDeteccion: string;
}

export class UpdateFallaDto {
  @ApiPropertyOptional({ enum: ['reportada', 'evaluando', 'en_reparacion', 'reparada', 'descartada'] })
  @IsOptional()
  @IsEnum(['reportada', 'evaluando', 'en_reparacion', 'reparada', 'descartada'])
  estado?: 'reportada' | 'evaluando' | 'en_reparacion' | 'reparada' | 'descartada';

  @ApiPropertyOptional({ enum: ['reparar_inmediato', 'cotizar', 'reemplazar'], description: 'Decisión tomada' })
  @IsOptional()
  @IsEnum(['reparar_inmediato', 'cotizar', 'reemplazar'])
  decision?: 'reparar_inmediato' | 'cotizar' | 'reemplazar';

  @ApiPropertyOptional({ example: 'cot-001', description: 'ID de la cotización asociada' })
  @IsOptional()
  @IsString()
  cotizacionId?: string;

  @ApiPropertyOptional({ example: 120, description: 'Tiempo de respuesta gerencia (minutos)' })
  @IsOptional()
  @IsNumber()
  tiempoRespuestaGerencia?: number;

  @ApiPropertyOptional({ example: 480, description: 'Tiempo total de parada (minutos)' })
  @IsOptional()
  @IsNumber()
  tiempoTotalParada?: number;

  @ApiPropertyOptional({ example: 950.00, description: 'Costo total de la falla' })
  @IsOptional()
  @IsNumber()
  costoFalla?: number;

  @ApiPropertyOptional({ example: 'Desgaste de sensor por vibración excesiva', description: 'Causa raíz' })
  @IsOptional()
  @IsString()
  causaRaiz?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/foto-post.jpg' })
  @IsOptional()
  @IsString()
  evidenciaPostUrl?: string;

  @ApiPropertyOptional({ example: 'Carlos Mendoza', description: 'Quién realizó la reparación' })
  @IsOptional()
  @IsString()
  reparadoPor?: string;

  @ApiPropertyOptional({ example: '2025-02-10', description: 'Fecha de reparación (ISO)' })
  @IsOptional()
  @IsString()
  fechaReparacion?: string;

  @ApiPropertyOptional({ example: '2025-02-10', description: 'Fecha de cierre (ISO)' })
  @IsOptional()
  @IsString()
  fechaCierre?: string;
}
