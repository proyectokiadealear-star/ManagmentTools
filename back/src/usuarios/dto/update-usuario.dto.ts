import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsIn, IsOptional, IsBoolean } from 'class-validator';
import type { Sede } from '../../common/enums/sede.enum';
import { Sede as SedeEnum } from '../../common/enums/sede.enum';
import type { AreaTaller } from '../../common/enums/area-taller.enum';
import { AreaTaller as AreaTallerEnum } from '../../common/enums/area-taller.enum';
import type { RolUsuario } from '../usuario.entity';

export class UpdateUsuarioDto {
  @ApiPropertyOptional({ example: 'Carlos Mendoza' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ example: 'cmendoza@surmotor.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: ['personal', 'tecnico', 'jefe'] })
  @IsOptional()
  @IsIn(['personal', 'tecnico', 'jefe'])
  rol?: RolUsuario;

  @ApiPropertyOptional({ enum: SedeEnum })
  @IsOptional()
  @IsIn(Object.values(SedeEnum))
  sede?: Sede;

  @ApiPropertyOptional({ enum: AreaTallerEnum })
  @IsOptional()
  @IsIn(Object.values(AreaTallerEnum))
  area?: AreaTaller;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fotoUrl?: string;
}
