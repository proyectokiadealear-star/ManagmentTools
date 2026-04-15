import { IsOptional, IsString, IsEnum } from 'class-validator';

export class FiltrosActivoDto {
  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  capacidad?: string;

  @IsOptional()
  @IsEnum(['activo', 'inactivo', 'en-reparacion', 'dado-de-baja'])
  estado?: string;

  @IsOptional()
  @IsEnum(['disponible', 'en-prestamo', 'en-mantenimiento', 'danado'])
  estadoOperativo?: string;

  @IsOptional()
  @IsString()
  areaId?: string;

  @IsOptional()
  @IsString()
  sede?: string;
}
