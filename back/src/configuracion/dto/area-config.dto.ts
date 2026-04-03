import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class AreaConfigDto {
  @ApiProperty({ example: 'TALLER' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Taller Mecánica' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: '#1e3a5f' })
  @IsString()
  color: string;

  @ApiProperty({ example: ['Diagnóstico', 'Alineación y Balanceo', 'Mecánica General'] })
  @IsArray()
  bahias: string[];
}

export class UpdateAreaDto {
  @ApiPropertyOptional({ example: 'Taller Mecánica General' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ example: '#2e4a6f' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: ['Diagnóstico', 'Alineación', 'Mecánica General', 'Eléctrica', 'Lavado'] })
  @IsOptional()
  @IsArray()
  bahias?: string[];
}
