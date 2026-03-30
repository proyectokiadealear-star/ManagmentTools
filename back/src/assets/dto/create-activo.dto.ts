import { IsString, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';

export class CreateActivoDto {
  @IsString()
  nombre: string;

  @IsString()
  tipo: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  modelo?: string;

  @IsOptional()
  @IsString()
  serial?: string;

  @IsOptional()
  @IsString()
  placa?: string;

  @IsOptional()
  @IsString()
  proveedor?: string;

  @IsOptional()
  @IsDateString()
  fechaCompra?: string;

  @IsOptional()
  @IsNumber()
  valor?: number;

  @IsString()
  areaId: string;

  @IsString()
  bahiaId: string;

  @IsString()
  rackId: string;

  @IsOptional()
  @IsString()
  cajaId?: string;

  @IsOptional()
  @IsString()
  responsable?: string;

  @IsOptional()
  @IsString()
  custodio?: string;

  @IsOptional()
  @IsEnum(['activo', 'inactivo', 'en-reparacion', 'dado-de-baja'])
  estado?: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}
