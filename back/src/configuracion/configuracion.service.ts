import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { AreaConfigDto, UpdateAreaDto } from './dto/area-config.dto';
import { GeneralConfigDto, UpdateGeneralConfigDto } from './dto/general-config.dto';

/** Default areas seed */
const DEFAULT_AREAS: AreaConfigDto[] = [
  { id: 'TALLER', nombre: 'Taller Mecánica', color: '#1e3a5f', bahias: ['Diagnóstico', 'Alineación y Balanceo', 'Mecánica General', 'Eléctrica', 'Lavado'] },
  { id: 'ENDEREZADO', nombre: 'Enderezado y Pintura', color: '#b45309', bahias: ['Enderezado 1', 'Enderezado 2', 'Cabina Pintura', 'Preparación'] },
  { id: 'PINTURA', nombre: 'Pintura', color: '#7c3aed', bahias: ['Cabina 1', 'Cabina 2', 'Preparación Pintura'] },
  { id: 'RECEPCION', nombre: 'Recepción', color: '#059669', bahias: ['Atención al Cliente', 'Entrega de Vehículos'] },
  { id: 'BODEGA', nombre: 'Bodega / Repuestos', color: '#dc2626', bahias: ['Herramientas Especiales', 'Repuestos', 'Vehículos Eléctricos', 'General'] },
];

/** Default general config seed */
const DEFAULT_GENERAL: GeneralConfigDto = {
  umbralReparacion: { verde: 0.3, amarillo: 0.5, rojo: 1.0 },
  diasAlertaMantenimiento: { verde: 30, amarillo: 15, naranja: 7, rojo: 0 },
  maxTamanoImagen: 5_242_880,
  monedaSimbolo: '$',
  toleranciaConsumo: 0.2,
  epiFrecuencias: {
    'guantes-nitrilo': 30,
    'mascarilla-n95': 90,
    'gafas-seguridad': 180,
    'botas-seguridad': 365,
  },
};

@Injectable()
export class ConfiguracionService {
  private readonly logger = new Logger(ConfiguracionService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore() {
    return this.firebaseService.getFirestore();
  }

  // ─── Areas ──────────────────────────────────────────────────────────────────

  async getAreas(): Promise<AreaConfigDto[]> {
    const doc = await this.firestore.collection('configuraciones').doc('areas').get();
    if (!doc.exists) {
      // Auto-seed if missing
      await this.seedAreas();
      return DEFAULT_AREAS;
    }
    return (doc.data() as any).areas as AreaConfigDto[];
  }

  async updateArea(areaId: string, updateDto: UpdateAreaDto): Promise<AreaConfigDto[]> {
    const areas = await this.getAreas();
    const index = areas.findIndex((a) => a.id === areaId);
    if (index === -1) {
      throw new NotFoundException(`Área con ID '${areaId}' no encontrada en la configuración`);
    }

    // Merge fields
    if (updateDto.nombre !== undefined) areas[index].nombre = updateDto.nombre;
    if (updateDto.color !== undefined) areas[index].color = updateDto.color;
    if (updateDto.bahias !== undefined) areas[index].bahias = updateDto.bahias;

    await this.firestore.collection('configuraciones').doc('areas').set({ areas });
    return areas;
  }

  // ─── General ────────────────────────────────────────────────────────────────

  async getGeneral(): Promise<GeneralConfigDto> {
    const doc = await this.firestore.collection('configuraciones').doc('general').get();
    if (!doc.exists) {
      await this.seedGeneral();
      return DEFAULT_GENERAL;
    }
    return doc.data() as GeneralConfigDto;
  }

  async updateGeneral(updateDto: UpdateGeneralConfigDto): Promise<GeneralConfigDto> {
    const current = await this.getGeneral();
    const merged: GeneralConfigDto = {
      ...current,
      ...updateDto,
      // Deep-merge nested objects
      umbralReparacion: updateDto.umbralReparacion
        ? { ...current.umbralReparacion, ...updateDto.umbralReparacion }
        : current.umbralReparacion,
      diasAlertaMantenimiento: updateDto.diasAlertaMantenimiento
        ? { ...current.diasAlertaMantenimiento, ...updateDto.diasAlertaMantenimiento }
        : current.diasAlertaMantenimiento,
      epiFrecuencias: updateDto.epiFrecuencias
        ? { ...current.epiFrecuencias, ...updateDto.epiFrecuencias }
        : current.epiFrecuencias,
    };

    await this.firestore.collection('configuraciones').doc('general').set(merged);
    return merged;
  }

  // ─── Seed ───────────────────────────────────────────────────────────────────

  private async seedAreas(): Promise<void> {
    await this.firestore.collection('configuraciones').doc('areas').set({ areas: DEFAULT_AREAS });
    this.logger.log('Seed: configuración de áreas insertada.');
  }

  private async seedGeneral(): Promise<void> {
    await this.firestore.collection('configuraciones').doc('general').set(DEFAULT_GENERAL);
    this.logger.log('Seed: configuración general insertada.');
  }

  async seedAll(): Promise<{ mensaje: string }> {
    await this.seedAreas();
    await this.seedGeneral();
    return { mensaje: 'Configuración por defecto sembrada exitosamente.' };
  }
}
