import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AssetsModule } from '../assets/assets.module';
import { FinanceModule } from '../finance/finance.module';
import { MantenimientosModule } from '../mantenimientos/mantenimientos.module';
import { FallasModule } from '../fallas/fallas.module';
import { PrestamosModule } from '../prestamos/prestamos.module';

@Module({
  imports: [AssetsModule, FinanceModule, MantenimientosModule, FallasModule, PrestamosModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
