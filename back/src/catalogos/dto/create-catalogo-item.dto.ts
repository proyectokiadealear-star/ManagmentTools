import { IsString, IsOptional, IsBoolean, IsIn, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

const CATALOGO_TIPOS = [
  'marca',
  'modelo',
  'tipo-activo',
  'proveedor',
  'estado-activo',
  'estado-operativo',
  'tipo-mantenimiento',
  'causa-falla',
  'categoria-insumo',
  'categoria-epp',
  'estado-devolucion',
  'tipo-cotizacion',
  'sancion',
] as const;

export class CreateCatalogoItemDto {
  @ApiProperty({ example: 'marca', enum: CATALOGO_TIPOS })
  @IsIn([...CATALOGO_TIPOS])
  catalogo: (typeof CATALOGO_TIPOS)[number];

  @ApiProperty({ example: 'KIA' })
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @Matches(/^[A-Z0-9ÁÉÍÓÚÑÜ\s\-\/\.]+$/, {
    message: 'El nombre solo puede contener letras, números, espacios, guiones, barras y puntos',
  })
  nombre: string;

  @ApiPropertyOptional({ example: 'abc123', description: 'ID de marca padre (solo para modelos)' })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateCatalogoItemDto {
  @ApiPropertyOptional({ example: 'KIA MOTORS' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @Matches(/^[A-Z0-9ÁÉÍÓÚÑÜ\s\-\/\.]+$/, {
    message: 'El nombre solo puede contener letras, números, espacios, guiones, barras y puntos',
  })
  nombre?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;
}
