import { Module } from '@nestjs/common';
import { EppService } from './epp.service';
import { EppController } from './epp.controller';

@Module({
  controllers: [EppController],
  providers: [EppService],
  exports: [EppService],
})
export class EppModule {}
