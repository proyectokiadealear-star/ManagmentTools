import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { StorageService } from './storage.service';
import { R2StorageService } from './r2-storage.service';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, R2StorageService, StorageService],
  exports: [AssetsService, StorageService, R2StorageService],
})
export class AssetsModule {}
