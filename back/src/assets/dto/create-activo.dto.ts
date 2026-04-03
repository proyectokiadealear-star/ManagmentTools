import { IsString, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActivoDto {
  @ApiProperty({ example: 'Scanner Automotriz GDS', description: 'Nombre / descripción del activo' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'Equipo', description: 'Tipo de activo: Equipo, Herramienta, Tablet, Conector' })
  @IsString()
  tipo: string;

  @ApiPropertyOptional({ example: 'KIA', description: 'Marca del activo' })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional({ example: 'GDS Mobile', description: 'Modelo del activo' })
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiPropertyOptional({ example: 'GDS-2022-8472', description: 'Número de serie' })
  @IsOptional()
  @IsString()
  serial?: string;

  @ApiPropertyOptional({ example: 'ACT-0045', description: 'Placa patrimonial' })
  @IsOptional()
  @IsString()
  placa?: string;

  @ApiPropertyOptional({ example: 'SUR-HER-001', description: 'Código interno de inventario' })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiPropertyOptional({ example: 'F-001-452', description: 'Número de factura de compra' })
  @IsOptional()
  @IsString()
  factura?: string;

  @ApiPropertyOptional({ example: 'Carlos Mendoza', description: 'Persona encargada del activo' })
  @IsOptional()
  @IsString()
  encargado?: string;

  @ApiPropertyOptional({ example: 'Actualizado en Enero', description: 'Comentarios adicionales' })
  @IsOptional()
  @IsString()
  comentario?: string;

  @ApiPropertyOptional({ example: 'AEKIA S.A.', description: 'Proveedor del activo' })
  @IsOptional()
  @IsString()
  proveedor?: string;

  @ApiPropertyOptional({ example: '28-oct-22', description: 'Fecha de compra' })
  @IsOptional()
  @IsString()
  fechaCompra?: string;

  @ApiPropertyOptional({ example: 2500.0, description: 'Valor de adquisición ($)' })
  @IsOptional()
  @IsNumber()
  valor?: number;

  @ApiPropertyOptional({ example: 5, description: 'Vida útil en años' })
  @IsOptional()
  @IsNumber()
  vidaUtil?: number;

  @ApiPropertyOptional({ example: 'OBD2 / CAN BUS', description: 'Capacidad o especificaciones técnicas' })
  @IsOptional()
  @IsString()
  capacidadEspecificacion?: string;

  @ApiPropertyOptional({ example: 'Anual', description: 'Periodicidad de mantenimiento' })
  @IsOptional()
  @IsString()
  periodicidad?: string;

  @ApiPropertyOptional({ example: 'K-GDS-01', description: 'Código del ítem según el proveedor' })
  @IsOptional()
  @IsString()
  itemProveedor?: string;

  @ApiProperty({ example: 'area-taller', description: 'ID del área donde se ubica el activo' })
  @IsString()
  areaId: string;

  @ApiProperty({ example: 'bahia-1', description: 'ID de la bahía' })
  @IsString()
  bahiaId: string;

  @ApiProperty({ example: 'rack-a', description: 'ID del rack / estante' })
  @IsString()
  rackId: string;

  @ApiPropertyOptional({ example: 'caja-001', description: 'ID de la caja / posición final' })
  @IsOptional()
  @IsString()
  cajaId?: string;

  @ApiPropertyOptional({ example: 'Jefe de Taller', description: 'Rol responsable del activo' })
  @IsOptional()
  @IsString()
  responsable?: string;

  @ApiPropertyOptional({ example: 'Carlos Mendoza', description: 'Persona custodia del activo' })
  @IsOptional()
  @IsString()
  custodio?: string;

  @ApiPropertyOptional({
    enum: ['activo', 'inactivo', 'en-reparacion', 'dado-de-baja'],
    example: 'activo',
    description: 'Estado administrativo del activo',
  })
  @IsOptional()
  @IsEnum(['activo', 'inactivo', 'en-reparacion', 'dado-de-baja'])
  estado?: string;

  @ApiPropertyOptional({ example: 'Requiere actualización anual', description: 'Observaciones' })
  @IsOptional()
  @IsString()
  observacion?: string;

  @ApiPropertyOptional({ example: 'https://r2.example.com/img.jpg', description: 'URL de la imagen del activo' })
  @IsOptional()
  @IsString()
  imagenUrl?: string;
}
