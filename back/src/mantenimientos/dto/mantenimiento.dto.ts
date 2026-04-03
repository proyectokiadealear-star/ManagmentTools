import { IsString, IsOptional, IsNumber, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProgramacionDto {
  @ApiProperty({ example: 'A001', description: 'ID del activo' })
  @IsString()
  activoId: string;

  @ApiProperty({ example: 'Scanner Automotriz GDS', description: 'Nombre del activo' })
  @IsString()
  activoNombre: string;

  @ApiProperty({ enum: ['preventivo', 'calibracion'], example: 'preventivo' })
  @IsEnum(['preventivo', 'calibracion'])
  tipo: 'preventivo' | 'calibracion';

  @ApiProperty({ example: 180, description: 'Periodicidad en días (ej. 180 = semestral)' })
  @IsNumber()
  periodicidadDias: number;

  @ApiPropertyOptional({ example: '2024-06-15', description: 'Fecha del último mantenimiento (ISO)' })
  @IsOptional()
  @IsString()
  ultimoMantenimiento?: string;

  @ApiProperty({ example: '2025-06-15', description: 'Fecha del próximo mantenimiento (ISO)' })
  @IsString()
  proximoMantenimiento: string;

  @ApiPropertyOptional({ example: 'Snap-on Service Center', description: 'Proveedor habitual' })
  @IsOptional()
  @IsString()
  proveedorHabitual?: string;

  @ApiProperty({ example: 'user-001', description: 'ID del responsable' })
  @IsString()
  responsableId: string;

  @ApiProperty({ example: 'Carlos Mendoza', description: 'Nombre del responsable' })
  @IsString()
  responsableNombre: string;
}

export class UpdateProgramacionDto {
  @ApiPropertyOptional({ enum: ['preventivo', 'calibracion'], example: 'preventivo' })
  @IsOptional()
  @IsEnum(['preventivo', 'calibracion'])
  tipo?: 'preventivo' | 'calibracion';

  @ApiPropertyOptional({ example: 90, description: 'Periodicidad en días' })
  @IsOptional()
  @IsNumber()
  periodicidadDias?: number;

  @ApiPropertyOptional({ example: '2025-03-15', description: 'Próximo mantenimiento (ISO)' })
  @IsOptional()
  @IsString()
  proximoMantenimiento?: string;

  @ApiPropertyOptional({ example: 'Snap-on Service Center', description: 'Proveedor habitual' })
  @IsOptional()
  @IsString()
  proveedorHabitual?: string;

  @ApiPropertyOptional({ example: 'user-002' })
  @IsOptional()
  @IsString()
  responsableId?: string;

  @ApiPropertyOptional({ example: 'Miguel Sánchez' })
  @IsOptional()
  @IsString()
  responsableNombre?: string;

  @ApiPropertyOptional({ enum: ['vigente', 'vencido', 'proximo', 'cancelado'] })
  @IsOptional()
  @IsEnum(['vigente', 'vencido', 'proximo', 'cancelado'])
  estado?: 'vigente' | 'vencido' | 'proximo' | 'cancelado';
}

export class CreateMantenimientoDto {
  @ApiProperty({ example: 'A001', description: 'ID del activo' })
  @IsString()
  activoId: string;

  @ApiProperty({ enum: ['preventivo', 'correctivo', 'calibracion'], example: 'preventivo' })
  @IsEnum(['preventivo', 'correctivo', 'calibracion'])
  tipo: 'preventivo' | 'correctivo' | 'calibracion';

  @ApiProperty({ example: 'Calibración de sensores de alineación', description: 'Descripción del trabajo' })
  @IsString()
  descripcion: string;

  @ApiPropertyOptional({ example: 'prov-001', description: 'ID del proveedor' })
  @IsOptional()
  @IsString()
  proveedorId?: string;

  @ApiProperty({ example: 'Snap-on Service Center', description: 'Nombre del proveedor' })
  @IsString()
  proveedorNombre: string;

  @ApiProperty({ example: 350.00, description: 'Costo final del mantenimiento' })
  @IsNumber()
  costoFinal: number;

  @ApiPropertyOptional({ example: '2025-01-15', description: 'Fecha programada (ISO)' })
  @IsOptional()
  @IsString()
  fechaProgramada?: string;

  @ApiProperty({ example: '2025-01-20', description: 'Fecha en que se realizó (ISO)' })
  @IsString()
  fechaRealizada: string;

  @ApiPropertyOptional({ example: ['https://storage.example.com/foto1.jpg'], description: 'URLs de evidencia', type: [String] })
  @IsOptional()
  @IsArray()
  evidenciaUrls?: string[];

  @ApiPropertyOptional({ example: 'https://storage.example.com/acta.pdf', description: 'Acta de calibración (URL)' })
  @IsOptional()
  @IsString()
  actaCalibracion?: string;

  @ApiPropertyOptional({ example: 'Sensores dentro de tolerancia', description: 'Observaciones' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ example: 'Carlos Mendoza', description: 'Quién realizó el mantenimiento' })
  @IsString()
  realizadoPor: string;
}
