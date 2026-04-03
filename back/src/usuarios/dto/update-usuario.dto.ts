import { ApiPropertyOptional } from '@nestjs/swagger';
import type { Sede } from '../../common/enums/sede.enum';
import { Sede as SedeEnum } from '../../common/enums/sede.enum';
import type { AreaTaller } from '../../common/enums/area-taller.enum';
import { AreaTaller as AreaTallerEnum } from '../../common/enums/area-taller.enum';
import type { RolUsuario } from '../usuario.entity';

export class UpdateUsuarioDto {
  @ApiPropertyOptional({ example: 'Carlos Mendoza' })
  nombre?: string;

  @ApiPropertyOptional({ example: 'cmendoza@surmotor.com' })
  email?: string;

  @ApiPropertyOptional({ enum: ['personal', 'tecnico', 'jefe'] })
  rol?: RolUsuario;

  @ApiPropertyOptional({ enum: SedeEnum })
  sede?: Sede;

  @ApiPropertyOptional({ enum: AreaTallerEnum })
  area?: AreaTaller;

  @ApiPropertyOptional()
  activo?: boolean;

  @ApiPropertyOptional()
  fotoUrl?: string;
}
