import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import * as path from 'path';

@Injectable()
export class R2StorageService implements OnModuleInit {
  private readonly logger = new Logger(R2StorageService.name);
  private client: S3Client | null = null;
  private isDemoMode = false;

  // Variables leídas de .env
  private readonly accountId = process.env.CF_R2_ACCOUNT_ID || '';
  private readonly accessKeyId = process.env.CF_R2_ACCESS_KEY_ID || '';
  private readonly secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY || '';
  private readonly bucketName = process.env.CF_R2_BUCKET_NAME || 'toolapp';
  private readonly publicDomain = process.env.CF_R2_PUBLIC_DOMAIN || '';

  async onModuleInit() {
    const hasCredentials =
      !!this.accountId && !!this.accessKeyId && !!this.secretAccessKey;

    if (!hasCredentials) {
      this.isDemoMode = true;
      this.logger.warn(
        '⚠️  R2 DEMO MODE: Credenciales de Cloudflare R2 no configuradas. ' +
          'Se usarán URLs de placeholder. Configura CF_R2_* en tu .env para habilitar uploads reales.',
      );
      return;
    }

    const endpoint = `https://${this.accountId}.r2.cloudflarestorage.com`;

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      // R2 no soporta el checksum de integridad de AWS v4 — lo desactivamos
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });

    // Verificar conectividad al bucket
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(
        `✅ Cloudflare R2 conectado — bucket: ${this.bucketName}`,
      );
    } catch (err: any) {
      this.logger.error(
        `❌ No se pudo conectar al bucket R2 "${this.bucketName}": ${err.message}`,
      );
      // No lanzar error — el servicio sigue funcionando (fallback a demo)
      this.isDemoMode = true;
    }
  }

  /**
   * Sube un archivo de imagen a R2 bajo la ruta activos/{activoId}/{filename}
   * Retorna la URL pública del archivo.
   */
  async uploadActivoImagen(
    activoId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato no permitido. Use JPG, PNG, WEBP o GIF.',
      );
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('La imagen no puede superar los 5 MB.');
    }

    if (this.isDemoMode) {
      this.logger.warn('R2 en modo demo — devolviendo URL de placeholder.');
      return `https://placehold.co/400x300/1e3a5f/ffffff?text=${encodeURIComponent(activoId)}`;
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const timestamp = Date.now();
    const objectKey = `activos/${activoId}/imagen_${timestamp}${ext}`;

    try {
      await this.client!.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'public, max-age=31536000',
          // Hace el objeto públicamente legible
          ACL: 'public-read',
        }),
      );

      const publicUrl = this.buildPublicUrl(objectKey);
      this.logger.log(`R2 imagen subida: ${publicUrl}`);
      return publicUrl;
    } catch (error: any) {
      this.logger.error('Error al subir imagen a Cloudflare R2', error?.message);
      throw new BadRequestException(
        'No se pudo subir la imagen a Cloudflare R2. Verifique la configuración.',
      );
    }
  }

  /**
   * Elimina un objeto de R2 dado su URL pública o su object key.
   */
  async deleteFile(publicUrl: string): Promise<void> {
    if (this.isDemoMode || !publicUrl) return;

    try {
      const objectKey = this.extractKeyFromUrl(publicUrl);
      if (!objectKey) return;

      await this.client!.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
        }),
      );
      this.logger.log(`R2 archivo eliminado: ${objectKey}`);
    } catch (error: any) {
      this.logger.warn(`No se pudo eliminar archivo de R2: ${error?.message}`);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private buildPublicUrl(objectKey: string): string {
    // Prioridad: dominio público personalizado (ej: cdn.surmotor.cl)
    if (this.publicDomain) {
      const domain = this.publicDomain.replace(/\/$/, '');
      return `${domain}/${objectKey}`;
    }
    // Fallback: URL pública del bucket R2 (requiere habilitar "Public Access" en R2)
    return `https://${this.bucketName}.${this.accountId}.r2.dev/${objectKey}`;
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      // Soporta: https://cdn.surmotor.cl/activos/...
      //          https://toolapp.{account}.r2.dev/activos/...
      const { pathname } = new URL(url);
      // pathname = /activos/{activoId}/imagen_123.jpg
      return pathname.startsWith('/') ? pathname.slice(1) : pathname;
    } catch {
      return null;
    }
  }
}
