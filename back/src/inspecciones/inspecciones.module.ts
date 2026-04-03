import { Module } from '@nestjs/common';
import { InspeccionesService } from './inspecciones.service';
import { InspeccionesController } from './inspecciones.controller';

@Module({
  controllers: [InspeccionesController],
  providers: [InspeccionesService],
  exports: [InspeccionesService],
})
export class InspeccionesModule {}
