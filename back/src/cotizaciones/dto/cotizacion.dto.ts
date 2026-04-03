import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCotizacionDto {
  @ApiProperty({ example: 'A005', description: 'ID del activo' })
  @IsString()
  activoId: string;

  @ApiProperty({ example: 'Alineadora 3D HawkEye', description: 'Nombre del activo' })
  @IsString()
  activoNombre: string;

  @ApiPropertyOptional({ example: 'falla-001', description: 'ID de falla asociada' })
  @IsOptional()
  @IsString()
  fallaId?: string;

  @ApiProperty({ enum: ['preventivo_mayor', 'correctivo'], example: 'correctivo' })
  @IsEnum(['preventivo_mayor', 'correctivo'])
  tipo: 'preventivo_mayor' | 'correctivo';

  @ApiProperty({ example: 'Reparación de sensor de alineación delantero izquierdo', description: 'Descripción' })
  @IsString()
  descripcion: string;

  @ApiProperty({ example: 1200.00, description: 'Monto estimado total' })
  @IsNumber()
  montoEstimado: number;

  @ApiProperty({ example: 'user-jefe-001', description: 'ID de quien solicita' })
  @IsString()
  solicitadoPor: string;
}

export class AddProformaDto {
  @ApiProperty({ example: 'Equipos Automotrices Cia Ltda', description: 'Nombre del proveedor' })
  @IsString()
  proveedorNombre: string;

  @ApiProperty({ example: 1150.00, description: 'Monto de la proforma' })
  @IsNumber()
  monto: number;

  @ApiProperty({ example: 5, description: 'Tiempo de ejecución (días)' })
  @IsNumber()
  tiempoEjecucionDias: number;

  @ApiProperty({ example: 6, description: 'Garantía (meses)' })
  @IsNumber()
  garantiaMeses: number;

  @ApiProperty({ example: true, description: 'Incluye repuestos' })
  @IsBoolean()
  incluyeRepuestos: boolean;

  @ApiProperty({ example: 30, description: 'Vigencia de la oferta (días)' })
  @IsNumber()
  vigenciaOfertaDias: number;

  @ApiPropertyOptional({ example: 'https://storage.example.com/proforma.pdf', description: 'URL del documento' })
  @IsOptional()
  @IsString()
  documentoUrl?: string;
}

export class SeleccionarProformaDto {
  @ApiProperty({ example: 0, description: 'Índice de la proforma seleccionada (0-based)' })
  @IsNumber()
  proformaSeleccionadaIdx: number;

  @ApiProperty({ example: 'Mejor relación precio/garantía', description: 'Justificación de la selección' })
  @IsString()
  justificacionSeleccion: string;
}

export class AprobarCotizacionDto {
  @ApiProperty({ example: 'Jefe de Taller', description: 'Quién aprueba' })
  @IsString()
  aprobadoPor: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/aprobacion.png', description: 'Evidencia de aprobación (screenshot/email)' })
  @IsOptional()
  @IsString()
  evidenciaAprobacion?: string;
}

export class RechazarCotizacionDto {
  @ApiProperty({ example: 'Presupuesto excede el tope autorizado', description: 'Justificación del rechazo' })
  @IsString()
  justificacionDescarte: string;
}

export class EjecutarCotizacionDto {
  @ApiProperty({ example: 1100.00, description: 'Costo final ejecutado' })
  @IsNumber()
  costoFinalEjecutado: number;
}
