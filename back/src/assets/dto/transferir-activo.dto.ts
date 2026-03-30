import { IsString, IsOptional } from 'class-validator';

export class TransferirActivoDto {
  @IsString()
  areaId: string;

  @IsString()
  bahiaId: string;

  @IsString()
  rackId: string;

  @IsOptional()
  @IsString()
  cajaId?: string;

  @IsString()
  motivo: string;
}
