import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsIn, IsOptional, IsBoolean } from 'class-validator';
import type { Sede } from '../../common/enums/sede.enum';
import { Sede as SedeEnum } from '../../common/enums/sede.enum';
import type { AreaTaller } from '../../common/enums/area-taller.enum';
import { AreaTaller as AreaTallerEnum } from '../../common/enums/area-taller.enum';
import type { RolUsuario } from '../usuario.entity';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Carlos Mendoza', description: 'Nombre completo del usuario' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'cmendoza@surmotor.com', description: 'Correo — será el login en Firebase Auth' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: ['personal', 'tecnico', 'jefe'], example: 'tecnico', description: 'Rol del usuario en el sistema' })
  @IsIn(['personal', 'tecnico', 'jefe'])
  rol: RolUsuario;

  @ApiProperty({ enum: SedeEnum, example: SedeEnum.SURMOTOR, description: 'Sede a la que pertenece el usuario' })
  @IsIn(Object.values(SedeEnum))
  sede: Sede;

  @ApiProperty({ enum: AreaTallerEnum, example: AreaTallerEnum.TALLER, description: 'Área del taller asignada' })
  @IsIn(Object.values(AreaTallerEnum))
  area: AreaTaller;

  @ApiPropertyOptional({
    example: 'MiPassword2024#',
    description:
      'Contraseña inicial para Firebase Auth. Si no se proporciona, se genera automáticamente (Surmotor + 4 dígitos + #).',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ example: true, description: 'true = activo, false = desactivado' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ example: 'https://...', description: 'URL de foto de perfil' })
  @IsOptional()
  @IsString()
  fotoUrl?: string;
}
