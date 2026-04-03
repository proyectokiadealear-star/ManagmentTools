import { Module } from '@nestjs/common';
import { ResponsabilidadesController } from './responsabilidades.controller';
import { ResponsabilidadesService } from './responsabilidades.service';

@Module({
  controllers: [ResponsabilidadesController],
  providers: [ResponsabilidadesService],
  exports: [ResponsabilidadesService],
})
export class ResponsabilidadesModule {}
