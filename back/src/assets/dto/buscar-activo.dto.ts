import { IsOptional, IsString } from 'class-validator';

export class BuscarActivoDto {
  @IsOptional()
  @IsString()
  q?: string; // búsqueda por nombre, tipo, serial, placa, marca
}
