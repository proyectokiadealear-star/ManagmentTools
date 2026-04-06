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

  @IsString()
  motivo: string;
}
