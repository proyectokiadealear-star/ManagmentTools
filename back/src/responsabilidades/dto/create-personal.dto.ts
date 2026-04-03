import { ApiProperty } from '@nestjs/swagger';

export class CreatePersonalDto {
  @ApiProperty({
    description: 'Nombre completo del personal',
    example: 'Carlos Mendoza',
  })
  nombre: string;

  @ApiProperty({
    description: 'Cargo del personal en el taller',
    example: 'Técnico Líder',
  })
  cargo: string;

  @ApiProperty({
    description: 'Área de trabajo del personal',
    example: 'Taller',
  })
  area: string;

  @ApiProperty({
    description: '¿El personal está activo?',
    required: false,
    default: true,
    example: true,
  })
  activo?: boolean;
}
