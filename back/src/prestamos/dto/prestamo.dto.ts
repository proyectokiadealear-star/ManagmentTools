import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Solicitar préstamo ────────────────────────────────────────────────────────
export class CreatePrestamoDto {
  @ApiProperty({ example: 'A003', description: 'ID de la herramienta a solicitar' })
  @IsString()
  herramientaId: string;

  @ApiProperty({ example: 'Torquímetro Digital 1/2"', description: 'Nombre de la herramienta' })
  @IsString()
  herramientaNombre: string;

  @ApiProperty({ example: 'ACT-0102', description: 'Placa de la herramienta' })
  @IsString()
  herramientaPlaca: string;

  @ApiProperty({ example: 'user-003', description: 'ID del solicitante' })
  @IsString()
  solicitanteId: string;

  @ApiProperty({ example: 'Miguel Sánchez', description: 'Nombre del solicitante' })
  @IsString()
  solicitanteNombre: string;

  @ApiProperty({ example: 'OT-2025-0042', description: 'Orden de trabajo vinculada' })
  @IsString()
  ordenTrabajo: string;

  @ApiProperty({ example: 'Ajuste de torque en suspensión delantera', description: 'Motivo del préstamo' })
  @IsString()
  motivo: string;

  @ApiProperty({ example: 4, description: 'Tiempo estimado de uso en horas' })
  @IsNumber()
  tiempoEstimadoHoras: number;
}

// ─── Aprobar préstamo ──────────────────────────────────────────────────────────
export class AprobarPrestamoDto {
  @ApiProperty({ example: 'user-001', description: 'ID del aprobador (jefe de taller)' })
  @IsString()
  aprobadorId: string;

  @ApiProperty({ example: 'Carlos Mendoza', description: 'Nombre del aprobador' })
  @IsString()
  aprobadorNombre: string;
}

// ─── Rechazar préstamo ─────────────────────────────────────────────────────────
export class RechazarPrestamoDto {
  @ApiProperty({ example: 'user-001', description: 'ID del aprobador que rechaza' })
  @IsString()
  aprobadorId: string;

  @ApiProperty({ example: 'Carlos Mendoza', description: 'Nombre del aprobador que rechaza' })
  @IsString()
  aprobadorNombre: string;

  @ApiPropertyOptional({ example: 'Herramienta reservada para otra OT', description: 'Motivo del rechazo' })
  @IsOptional()
  @IsString()
  motivo?: string;
}

// ─── Registrar retiro ──────────────────────────────────────────────────────────
export class RegistrarRetiroDto {
  @ApiPropertyOptional({ example: 'QR-PREST-001', description: 'Código QR generado para seguimiento' })
  @IsOptional()
  @IsString()
  codigoQR?: string;
}

// ─── Registrar devolución ──────────────────────────────────────────────────────
export class RegistrarDevolucionDto {
  @ApiProperty({ enum: ['bueno', 'regular', 'danado'], description: 'Estado en que se devuelve la herramienta' })
  @IsEnum(['bueno', 'regular', 'danado'])
  estadoDevolucion: 'bueno' | 'regular' | 'danado';

  @ApiProperty({ example: true, description: '¿La herramienta funciona completamente?' })
  @IsBoolean()
  funcionCompleta: boolean;

  @ApiProperty({ example: true, description: '¿Todos los accesorios están completos?' })
  @IsBoolean()
  accesoriosCompletos: boolean;

  @ApiProperty({ example: true, description: '¿La limpieza es aceptable?' })
  @IsBoolean()
  limpiezaAceptable: boolean;

  @ApiPropertyOptional({ example: 'Pequeño rayón en carcasa', description: 'Observaciones sobre la devolución' })
  @IsOptional()
  @IsString()
  observacionesDevolucion?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/dano.jpg', description: 'URL de fotografía del daño' })
  @IsOptional()
  @IsString()
  fotografiaDanoUrl?: string;
}

// ─── Registrar daño ────────────────────────────────────────────────────────────
export class RegistrarDanoDto {
  @ApiProperty({ example: 'Pantalla rota', description: 'Tipo de daño encontrado' })
  @IsString()
  tipoDano: string;

  @ApiPropertyOptional({ example: 150.00, description: 'Costo estimado de reparación' })
  @IsOptional()
  @IsNumber()
  costoReparacion?: number;

  @ApiPropertyOptional({ example: 650.00, description: 'Costo de reposición completa' })
  @IsOptional()
  @IsNumber()
  costoReposicion?: number;

  @ApiProperty({ enum: ['descuento_nomina', 'reposicion', 'reparacion_compartida'], description: 'Tipo de sanción aplicada' })
  @IsEnum(['descuento_nomina', 'reposicion', 'reparacion_compartida'])
  sancion: 'descuento_nomina' | 'reposicion' | 'reparacion_compartida';

  @ApiPropertyOptional({ example: 150.00, description: 'Monto de la sanción' })
  @IsOptional()
  @IsNumber()
  montoSancion?: number;
}
