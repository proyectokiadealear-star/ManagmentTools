import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { R2StorageService } from './r2-storage.service';

/**
 * StorageService — Fachada de almacenamiento de objetos.
 *
 * Delega en R2StorageService (Cloudflare R2, S3-compatible).
 * Mantiene la misma firma pública para no romper AssetsController.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly r2: R2StorageService) {}

  /**
   * Sube la imagen de un activo a Cloudflare R2.
   * Retorna la URL pública del objeto.
   */
  async uploadActivoImagen(
    activoId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    return this.r2.uploadActivoImagen(activoId, file);
  }

  /**
   * Elimina un archivo de Cloudflare R2 dado su URL pública.
   */
  async deleteFile(publicUrl: string): Promise<void> {
    return this.r2.deleteFile(publicUrl);
  }
}
