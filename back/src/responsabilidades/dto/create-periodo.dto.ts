import { ApiProperty } from '@nestjs/swagger';

export class CreatePeriodoDto {
  @ApiProperty({
    description: 'Nivel de la responsabilidad',
    enum: ['area', 'caja'],
    example: 'area',
  })
  nivel: string;

  @ApiProperty({
    description: 'Nombre del área asignada',
    example: 'Taller',
  })
  area: string;

  @ApiProperty({
    description: 'Identificador de caja (solo para nivel caja)',
    required: false,
    example: 'CAJA-001',
  })
  caja?: string;

  @ApiProperty({
    description: 'ID del personal asignado',
    example: 'PT-001',
  })
  personalId: string;

  @ApiProperty({
    description: 'Nombre completo del personal asignado',
    example: 'Carlos Mendoza',
  })
  personalNombre: string;

  @ApiProperty({
    description: 'Tipo de asignación',
    enum: ['titular', 'co_responsable'],
    example: 'titular',
  })
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
  permisos: string[];

  @ApiProperty({
    description: 'Fecha de inicio del período (YYYY-MM-DD)',
    example: '2025-01-10',
  })
  fechaInicio: string;

  @ApiProperty({
    description: 'Nombre del usuario que realiza la asignación',
    example: 'Jefe de Taller',
  })
  asignadoPor: string;

  @ApiProperty({
    description: 'Observación opcional sobre la asignación',
    required: false,
    example: 'Asignación por período de prueba',
  })
  observacion?: string;
}
