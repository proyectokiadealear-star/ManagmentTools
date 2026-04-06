import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { FirebaseModule } from './firebase/firebase.module';
import { AssetsModule } from './assets/assets.module';
import { LocationsModule } from './locations/locations.module';
import { ResponsabilidadesModule } from './responsabilidades/responsabilidades.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { FinanceModule } from './finance/finance.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { MantenimientosModule } from './mantenimientos/mantenimientos.module';
import { FallasModule } from './fallas/fallas.module';
import { CotizacionesModule } from './cotizaciones/cotizaciones.module';
import { PrestamosModule } from './prestamos/prestamos.module';
import { InsumosModule } from './insumos/insumos.module';
import { EppModule } from './epp/epp.module';
import { InspeccionesModule } from './inspecciones/inspecciones.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    FirebaseModule,
    AssetsModule,
    LocationsModule,
    CatalogosModule,
    ResponsabilidadesModule,
    UsuariosModule,
    AuthModule,
    FinanceModule,
    ConfiguracionModule,
    MantenimientosModule,
    FallasModule,
    CotizacionesModule,
    PrestamosModule,
    InsumosModule,
    EppModule,
    InspeccionesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
