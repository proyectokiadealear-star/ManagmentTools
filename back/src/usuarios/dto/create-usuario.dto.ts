import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Sede } from '../../common/enums/sede.enum';
import { Sede as SedeEnum } from '../../common/enums/sede.enum';
import type { AreaTaller } from '../../common/enums/area-taller.enum';
import { AreaTaller as AreaTallerEnum } from '../../common/enums/area-taller.enum';
import type { RolUsuario } from '../usuario.entity';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Carlos Mendoza', description: 'Nombre completo del usuario' })
  nombre: string;

  @ApiProperty({ example: 'cmendoza@surmotor.com', description: 'Correo — será el login en Firebase Auth' })
  email: string;

  @ApiProperty({ enum: ['personal', 'tecnico', 'jefe'], example: 'tecnico', description: 'Rol del usuario en el sistema' })
  rol: RolUsuario;

  @ApiProperty({ enum: SedeEnum, example: SedeEnum.SURMOTOR, description: 'Sede a la que pertenece el usuario' })
  sede: Sede;

  @ApiProperty({ enum: AreaTallerEnum, example: AreaTallerEnum.TALLER, description: 'Área del taller asignada' })
  area: AreaTaller;

  @ApiPropertyOptional({ example: true, description: 'true = activo, false = desactivado' })
  activo?: boolean;

  @ApiPropertyOptional({ example: 'https://...', description: 'URL de foto de perfil' })
  fotoUrl?: string;
}
