import { Module } from '@nestjs/common';
import { FallasService } from './fallas.service';
import { FallasController } from './fallas.controller';

@Module({
  controllers: [FallasController],
  providers: [FallasService],
  exports: [FallasService],
})
export class FallasModule {}
