import { IsString, IsOptional, IsNumber, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFallaDto {
  @ApiProperty({ example: 'A005', description: 'ID del activo afectado' })
  @IsString()
  activoId: string;

  @ApiProperty({ example: 'Alineadora 3D HawkEye', description: 'Nombre del activo' })
  @IsString()
  activoNombre: string;

  @ApiPropertyOptional({ example: 'A005-2024-001', description: 'Código interno del activo' })
  @IsOptional()
  @IsString()
  activoCodigo?: string;

  @ApiPropertyOptional({ example: 'PLACA-001', description: 'Placa del activo' })
  @IsOptional()
  @IsString()
  activoPlaca?: string;

  @ApiProperty({ example: 'Sensor delantero con lecturas inconsistentes ±3mm', description: 'Descripción de los síntomas' })
  @IsString()
  descripcionSintomas: string;

  @ApiPropertyOptional({ example: ['https://storage.example.com/foto1.jpg', 'https://storage.example.com/foto2.jpg'], description: 'URLs de fotografías' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotografiaUrls?: string[];

  @ApiProperty({ example: 'No se pueden realizar alineaciones — servicio detenido', description: 'Impacto operativo' })
  @IsString()
  impactoOperativo: string;

  @ApiPropertyOptional({ enum: ['critica', 'alta', 'media', 'baja'], description: 'Nivel de urgencia' })
  @IsOptional()
  @IsEnum(['critica', 'alta', 'media', 'baja'])
  urgencia?: 'critica' | 'alta' | 'media' | 'baja';

  @ApiPropertyOptional({ enum: ['electrica', 'mecanica', 'hidraulica', 'neumática', 'estructural', 'software', 'otro'], description: 'Tipo de falla' })
  @IsOptional()
  @IsEnum(['electrica', 'mecanica', 'hidraulica', 'neumática', 'estructural', 'software', 'otro'])
  tipoFalla?: 'electrica' | 'mecanica' | 'hidraulica' | 'neumática' | 'estructural' | 'software' | 'otro';

  @ApiProperty({ example: 'user-003', description: 'ID de quien reporta' })
  @IsString()
  reportadoPor: string;

  @ApiProperty({ example: 'Miguel Sánchez', description: 'Nombre de quien reporta' })
  @IsString()
  reportadoPorNombre: string;

  @ApiProperty({ example: '2025-02-05', description: 'Fecha en que se detectó la falla (ISO)' })
  @IsString()
  fechaDeteccion: string;

  @ApiPropertyOptional({ example: '08:30', description: 'Hora de detección' })
  @IsOptional()
  @IsString()
  horaDeteccion?: string;
}

export class UpdateFallaDto {
  @ApiPropertyOptional({ enum: ['reportada', 'evaluando', 'en_reparacion', 'reparada', 'descartada'] })
  @IsOptional()
  @IsEnum(['reportada', 'evaluando', 'en_reparacion', 'reparada', 'descartada'])
  estado?: 'reportada' | 'evaluando' | 'en_reparacion' | 'reparada' | 'descartada';

  @ApiPropertyOptional({ enum: ['reparar_inmediato', 'cotizar', 'reemplazar'], description: 'Decisión tomada' })
  @IsOptional()
  @IsEnum(['reparar_inmediato', 'cotizar', 'reemplazar'])
  decision?: 'reparar_inmediato' | 'cotizar' | 'reemplazar';

  @ApiPropertyOptional({ example: 'cot-001', description: 'ID de la cotización asociada' })
  @IsOptional()
  @IsString()
  cotizacionId?: string;

  // Tiempos de respuesta (minutos)
  @ApiPropertyOptional({ example: 15, description: 'Tiempo de detección a reporte (minutos)' })
  @IsOptional()
  @IsNumber()
  tiempoDeteccionAReporte?: number;

  @ApiPropertyOptional({ example: 75, description: 'Tiempo de reporte a respuesta de gerencia (minutos)' })
  @IsOptional()
  @IsNumber()
  tiempoReporteARespuestaGerencia?: number;

  @ApiPropertyOptional({ example: 120, description: 'Tiempo de respuesta a inicio de reparación (minutos)' })
  @IsOptional()
  @IsNumber()
  tiempoRespuestaAInicioReparacion?: number;

  @ApiPropertyOptional({ example: 270, description: 'Tiempo total de parada (minutos)' })
  @IsOptional()
  @IsNumber()
  tiempoTotalParada?: number;

  // Respuesta de gerencia
  @ApiPropertyOptional({ example: 'Se autoriza reparación inmediata', description: 'Respuesta de gerencia' })
  @IsOptional()
  @IsString()
  respuestaGerencia?: string;

  @ApiPropertyOptional({ example: '2025-02-05T09:45:00Z', description: 'Fecha de respuesta de gerencia' })
  @IsOptional()
  @IsString()
  fechaRespuestaGerencia?: string;

  @ApiPropertyOptional({ example: true, description: 'Cumple con SLA interno' })
  @IsOptional()
  slaCumple?: boolean;

  // Costos
  @ApiPropertyOptional({ example: 450.00, description: 'Costo de repuestos' })
  @IsOptional()
  @IsNumber()
  costoRepuestos?: number;

  @ApiPropertyOptional({ example: 200.00, description: 'Costo de mano de obra' })
  @IsOptional()
  @IsNumber()
  costoManoObra?: number;

  @ApiPropertyOptional({ example: 650.00, description: 'Costo total de la falla' })
  @IsOptional()
  @IsNumber()
  costoFalla?: number;

  // Reparación
  @ApiPropertyOptional({ example: 'Desgaste de capacitor de arranque', description: 'Causa raíz identificada' })
  @IsOptional()
  @IsString()
  causaRaiz?: string;

  @ApiPropertyOptional({ example: 'Reemplazo de capacitor de arranque', description: 'Acción correctiva realizada' })
  @IsOptional()
  @IsString()
  accionCorrectiva?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/foto-post.jpg' })
  @IsOptional()
  @IsString()
  evidenciaPostUrl?: string;

  @ApiPropertyOptional({ example: ['https://storage.example.com/foto-post1.jpg', 'https://storage.example.com/foto-post2.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenciaPostUrls?: string[];

  @ApiPropertyOptional({ example: 'Carlos Mendoza', description: 'Quién realizó la reparación' })
  @IsOptional()
  @IsString()
  reparadoPor?: string;

  @ApiPropertyOptional({ example: 180, description: 'Tiempo de reparación (minutos)' })
  @IsOptional()
  @IsNumber()
  tiempoReparacion?: number;

  @ApiPropertyOptional({ example: '2025-02-10', description: 'Fecha de inicio de reparación (ISO)' })
  @IsOptional()
  @IsString()
  fechaInicioReparacion?: string;

  @ApiPropertyOptional({ example: '2025-02-10', description: 'Fecha de reparación (ISO)' })
  @IsOptional()
  @IsString()
  fechaReparacion?: string;

  @ApiPropertyOptional({ example: '2025-02-10', description: 'Fecha de cierre (ISO)' })
  @IsOptional()
  @IsString()
  fechaCierre?: string;

  // Análisis y aprendizaje
  @ApiPropertyOptional({ example: true, description: 'Es una falla repetida' })
  @IsOptional()
  tipoFallaRepetida?: boolean;

  @ApiPropertyOptional({ example: ['act-001', 'act-002'], description: 'Activos similares afectados' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activosSimilaresafectados?: string[];

  @ApiPropertyOptional({ example: 'Programar revisión de capacitores en otros equipos similares', description: 'Sugerencia preventiva' })
  @IsOptional()
  @IsString()
  sugerenciaPreventiva?: string;
}
