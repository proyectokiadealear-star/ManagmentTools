import { Module } from '@nestjs/common';
import { EppService } from './epp.service';
import { EppController } from './epp.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [UsuariosModule],
  controllers: [EppController],
  providers: [EppService],
  exports: [EppService],
})
export class EppModule {}
