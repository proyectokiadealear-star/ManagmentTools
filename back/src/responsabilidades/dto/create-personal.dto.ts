import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreatePersonalDto {
  @ApiProperty({
    description: 'Nombre completo del personal',
    example: 'Carlos Mendoza',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    description: 'Cargo del personal en el taller',
    example: 'Técnico Líder',
  })
  @IsString()
  @IsNotEmpty()
  cargo: string;

  @ApiProperty({
    description: 'Área de trabajo del personal',
    example: 'Taller',
  })
  @IsString()
  @IsNotEmpty()
  area: string;

  @ApiProperty({
    description: '¿El personal está activo?',
    required: false,
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
