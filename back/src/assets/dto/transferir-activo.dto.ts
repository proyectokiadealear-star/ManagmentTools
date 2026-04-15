import { IsString, IsOptional } from 'class-validator';

export class TransferirActivoDto {
  @IsString()
  areaId: string;

  @IsOptional()
  @IsString()
  bahiaId?: string;

  @IsOptional()
  @IsString()
  rackId?: string;

  @IsOptional()
  @IsString()
  cajaId?: string;

  @IsOptional()
  @IsString()
  // Campo legacy/informativo: la sede final de transferencia se deriva desde areaId.
  sede?: string;

  @IsString()
  motivo: string;
}
