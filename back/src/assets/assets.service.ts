import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { Activo } from './entities/activo.entity';
import { CreateActivoDto } from './dto/create-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';
import { TransferirActivoDto } from './dto/transferir-activo.dto';
import { Movimiento, Ubicacion } from './entities/movimiento.entity';

@Injectable()
export class AssetsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  async findAll(): Promise<Activo[]> {
    const snapshot = await this.firestore.collection('activos').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activo));
  }

  async findOne(id: string): Promise<Activo> {
    const doc = await this.firestore.collection('activos').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Activo con ID ${id} no encontrado`);
    }
    return { id: doc.id, ...doc.data() } as Activo;
  }

  async create(createActivoDto: CreateActivoDto, usuarioId: string): Promise<Activo> {
    const ocupada = await this.validarUbicacionOcupada(
      createActivoDto.areaId,
      createActivoDto.bahiaId,
      createActivoDto.rackId,
    );
    if (ocupada) {
      throw new ConflictException('Ubicación ya ocupada por otro equipo');
    }

    const now = new Date().toISOString();
    const activo: Omit<Activo, 'id'> = {
      ...createActivoDto,
      estado: (createActivoDto.estado as Activo['estado']) || 'activo',
      createdAt: now,
      updatedAt: now,
      usuarioId,
    };

    const docRef = await this.firestore.collection('activos').add(activo);
    return { id: docRef.id, ...activo };
  }

  async update(id: string, updateActivoDto: UpdateActivoDto): Promise<Activo> {
    const existente = await this.findOne(id);
    const actualizado: Activo = {
      ...existente,
      ...updateActivoDto,
      estado: (updateActivoDto.estado || existente.estado) as Activo['estado'],
      updatedAt: new Date().toISOString(),
    };

    await this.firestore.collection('activos').doc(id).update(actualizado as any);
    return actualizado;
  }

  async remove(id: string): Promise<void> {
    const existente = await this.findOne(id);
    await this.firestore.collection('activos').doc(id).delete();
  }

  async transferir(
    id: string,
    transferirDto: TransferirActivoDto,
    usuarioId: string,
    usuarioNombre?: string,
  ): Promise<Activo> {
    const existente = await this.findOne(id);

    const movimiento: Omit<Movimiento, 'id'> = {
      activoId: id,
      activoNombre: existente.nombre,
      desde: {
        areaId: existente.areaId,
        bahiaId: existente.bahiaId,
        rackId: existente.rackId,
      },
      hasta: {
        areaId: transferirDto.areaId,
        bahiaId: transferirDto.bahiaId,
        rackId: transferirDto.rackId,
        cajaId: transferirDto.cajaId,
      },
      motivo: transferirDto.motivo,
      usuarioId,
      usuarioNombre,
      fecha: new Date().toISOString(),
      tipo: 'transferencia',
    };

    await this.firestore.collection('movimientos').add(movimiento);

    return this.update(id, {
      areaId: transferirDto.areaId,
      bahiaId: transferirDto.bahiaId,
      rackId: transferirDto.rackId,
      cajaId: transferirDto.cajaId,
    });
  }

  async getMovimientos(activoId: string): Promise<Movimiento[]> {
    const snapshot = await this.firestore
      .collection('movimientos')
      .where('activoId', '==', activoId)
      .orderBy('fecha', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movimiento));
  }

  async validarUbicacionOcupada(areaId: string, bahiaId: string, rackId: string): Promise<boolean> {
    const snapshot = await this.firestore
      .collection('activos')
      .where('areaId', '==', areaId)
      .where('bahiaId', '==', bahiaId)
      .where('rackId', '==', rackId)
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  async getActivoEnUbicacion(areaId: string, bahiaId: string, rackId: string): Promise<Activo | null> {
    const snapshot = await this.firestore
      .collection('activos')
      .where('areaId', '==', areaId)
      .where('bahiaId', '==', bahiaId)
      .where('rackId', '==', rackId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Activo;
  }
}
