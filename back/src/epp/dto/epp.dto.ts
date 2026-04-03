import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Crear EPP en catálogo ──────────────────────────────────────────────────────
export class CreateCatalogoEPPDto {
  @ApiProperty({ example: 'Guantes de nitrilo talla M', description: 'Nombre del EPP' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'guantes-nitrilo', description: 'Tipo: guantes-nitrilo, mascarilla-n95, gafas-seguridad, botas-seguridad, protector-auditivo, etc.' })
  @IsString()
  tipo: string;

  @ApiProperty({ example: 30, description: 'Frecuencia de reposición en días (30, 90, 180, 365)' })
  @IsNumber()
  @Min(1)
  frecuenciaReposicionDias: number;

  @ApiProperty({ example: 15.50, description: 'Costo unitario del EPP' })
  @IsNumber()
  @Min(0)
  costoUnitario: number;

  @ApiPropertyOptional({ example: 200, description: 'Stock actual disponible' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockActual?: number;
}

// ─── Actualizar EPP del catálogo (parcial) ──────────────────────────────────────
export class UpdateCatalogoEPPDto {
  @ApiPropertyOptional({ example: 'Guantes de nitrilo talla M', description: 'Nombre del EPP' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ example: 'guantes-nitrilo', description: 'Tipo de EPP' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ example: 30, description: 'Frecuencia de reposición en días' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  frecuenciaReposicionDias?: number;

  @ApiPropertyOptional({ example: 15.50, description: 'Costo unitario del EPP' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoUnitario?: number;

  @ApiPropertyOptional({ example: 200, description: 'Stock actual disponible' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockActual?: number;
}

// ─── Registrar entrega de EPP ───────────────────────────────────────────────────
export class RegistrarEntregaDto {
  @ApiProperty({ example: 'EPP-001', description: 'ID del EPP del catálogo' })
  @IsString()
  eppId: string;

  @ApiProperty({ example: 'user-003', description: 'ID del técnico que recibe el EPP' })
  @IsString()
  tecnicoId: string;

  @ApiProperty({ example: 'Miguel Sánchez', description: 'Nombre del técnico' })
  @IsString()
  tecnicoNombre: string;

  @ApiProperty({ example: 'area-taller', description: 'ID del área' })
  @IsString()
  areaId: string;

  @ApiProperty({ example: 2, description: 'Cantidad entregada' })
  @IsNumber()
  @Min(1)
  cantidad: number;

  @ApiPropertyOptional({ example: 'LOTE-2025-A001', description: 'Lote del proveedor' })
  @IsOptional()
  @IsString()
  loteProveedor?: string;

  @ApiProperty({ example: false, description: '¿Es una entrega extraordinaria (fuera de calendario)?' })
  @IsBoolean()
  esExtraordinaria: boolean;

  @ApiPropertyOptional({ example: 'Guante roto durante operación con solvente', description: 'Motivo de la entrega extraordinaria' })
  @IsOptional()
  @IsString()
  motivoExtraordinaria?: string;

  @ApiProperty({ example: 'user-001', description: 'ID de quien entrega el EPP' })
  @IsString()
  entregadoPor: string;

  @ApiProperty({ example: 'Carlos Ramírez', description: 'Nombre de quien entrega' })
  @IsString()
  entregadoPorNombre: string;
}
