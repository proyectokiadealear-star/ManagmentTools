import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Crear / actualizar catálogo de insumo ──────────────────────────────────────
export class CreateCatalogoInsumoDto {
  @ApiProperty({ example: 'Pintura base bicapa KIA P5', description: 'Nombre del insumo' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'pintura', description: 'Tipo: pintura, barniz, lija, masking, aceite, filtros, etc.' })
  @IsString()
  tipo: string;

  @ApiProperty({ example: 'INS-PIN-001', description: 'Código interno del insumo' })
  @IsString()
  codigo: string;

  @ApiProperty({ example: 'litros', description: 'Unidad de medida: litros, unidades, rollos, metros, galones' })
  @IsString()
  unidadMedida: string;

  @ApiProperty({ example: 45.50, description: 'Costo por unidad de medida' })
  @IsNumber()
  @Min(0)
  costoUnitario: number;

  @ApiProperty({ example: 2.5, description: 'Consumo promedio histórico por orden de trabajo' })
  @IsNumber()
  @Min(0)
  consumoPromedioPorOT: number;

  @ApiPropertyOptional({ example: 50, description: 'Stock actual disponible' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockActual?: number;

  @ApiPropertyOptional({ example: 10, description: 'Stock mínimo antes de reorden' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number;
}

// ─── Actualizar catálogo de insumo (parcial) ────────────────────────────────────
export class UpdateCatalogoInsumoDto {
  @ApiPropertyOptional({ example: 'Pintura base bicapa KIA P5', description: 'Nombre del insumo' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ example: 'pintura', description: 'Tipo de insumo' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ example: 'INS-PIN-001', description: 'Código interno del insumo' })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiPropertyOptional({ example: 'litros', description: 'Unidad de medida' })
  @IsOptional()
  @IsString()
  unidadMedida?: string;

  @ApiPropertyOptional({ example: 45.50, description: 'Costo por unidad de medida' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoUnitario?: number;

  @ApiPropertyOptional({ example: 2.5, description: 'Consumo promedio histórico por OT' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  consumoPromedioPorOT?: number;

  @ApiPropertyOptional({ example: 50, description: 'Stock actual disponible' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockActual?: number;

  @ApiPropertyOptional({ example: 10, description: 'Stock mínimo antes de reorden' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number;
}

// ─── Registrar consumo de insumo ────────────────────────────────────────────────
export class RegistrarConsumoDto {
  @ApiProperty({ example: 'OT-2025-0042', description: 'ID de la orden de trabajo' })
  @IsString()
  ordenTrabajoId: string;

  @ApiProperty({ example: 'INS-001', description: 'ID del insumo del catálogo' })
  @IsString()
  insumoId: string;

  @ApiProperty({ example: 3.2, description: 'Cantidad consumida' })
  @IsNumber()
  @Min(0.01)
  cantidad: number;

  @ApiProperty({ example: 'user-003', description: 'ID del técnico que registra el consumo' })
  @IsString()
  tecnicoId: string;

  @ApiProperty({ example: 'Miguel Sánchez', description: 'Nombre del técnico' })
  @IsString()
  tecnicoNombre: string;

  @ApiProperty({ example: 'area-taller', description: 'ID del área donde se consumió' })
  @IsString()
  areaId: string;

  @ApiPropertyOptional({ example: 'Pieza requirió capa adicional por defecto de fábrica', description: 'Justificación si excede tolerancia' })
  @IsOptional()
  @IsString()
  justificacion?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/evidencia.jpg', description: 'URL de evidencia fotográfica' })
  @IsOptional()
  @IsString()
  evidenciaUrl?: string;
}

// ─── Clasificar anomalía ────────────────────────────────────────────────────────
export class ClasificarAnomaliaDto {
  @ApiProperty({
    enum: ['tecnica_ineficiente', 'defecto_proveedor', 'sustraccion', 'justificado'],
    description: 'Clasificación de la anomalía detectada',
    example: 'defecto_proveedor',
  })
  @IsEnum(['tecnica_ineficiente', 'defecto_proveedor', 'sustraccion', 'justificado'])
  clasificacion: 'tecnica_ineficiente' | 'defecto_proveedor' | 'sustraccion' | 'justificado';
}
