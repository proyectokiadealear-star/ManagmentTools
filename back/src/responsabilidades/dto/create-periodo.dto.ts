import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsArray, ArrayNotEmpty } from 'class-validator';

export class CreatePeriodoDto {
  @ApiProperty({
    description: 'Nivel de la responsabilidad',
    enum: ['area', 'caja'],
    example: 'area',
  })
  @IsIn(['area', 'caja'])
  nivel: string;

  @ApiProperty({
    description: 'Nombre del área asignada',
    example: 'Taller',
  })
  @IsString()
  @IsNotEmpty()
  area: string;

  @ApiProperty({
    description: 'Identificador de caja (solo para nivel caja)',
    required: false,
    example: 'CAJA-001',
  })
  @IsOptional()
  @IsString()
  caja?: string;

  @ApiProperty({
    description: 'ID del personal asignado',
    example: 'PT-001',
  })
  @IsString()
  @IsNotEmpty()
  personalId: string;

  @ApiProperty({
    description: 'Nombre completo del personal asignado',
    example: 'Carlos Mendoza',
  })
  @IsString()
  @IsNotEmpty()
  personalNombre: string;

  @ApiProperty({
    description: 'Tipo de asignación',
    enum: ['titular', 'co_responsable'],
    example: 'titular',
  })
  @IsIn(['titular', 'co_responsable'])
  tipo: string;

  @ApiProperty({
    description: 'Lista de permisos otorgados',
    type: [String],
    enum: [
      'gestionar_prestamos',
      'aprobar_devoluciones',
      'registrar_fallas',
      'gestionar_epp',
      'ver_reportes',
    ],
    example: ['gestionar_prestamos', 'ver_reportes'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permisos: string[];

  @ApiProperty({
    description: 'Fecha de inicio del período (YYYY-MM-DD)',
    example: '2025-01-10',
  })
  @IsString()
  @IsNotEmpty()
  fechaInicio: string;

  @ApiProperty({
    description: 'Nombre del usuario que realiza la asignación',
    example: 'Jefe de Taller',
  })
  @IsString()
  @IsNotEmpty()
  asignadoPor: string;

  @ApiProperty({
    description: 'Observación opcional sobre la asignación',
    required: false,
    example: 'Asignación por período de prueba',
  })
  @IsOptional()
  @IsString()
  observacion?: string;
}
