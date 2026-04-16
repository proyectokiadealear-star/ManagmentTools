import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InsumosService } from './insumos.service';
import { FirebaseService } from '../firebase/firebase.service';
import { UsuariosService } from '../usuarios/usuarios.service';

describe('InsumosService — validación de elegibilidad', () => {
  let service: InsumosService;

  const catalogDocGet = jest.fn();
  const catalogDocUpdate = jest.fn();
  const consumoAdd = jest.fn();
  const findAssignableById = jest.fn();

  const mockFirestore = {
    collection: jest.fn((name: string) => {
      if (name === 'catalogo_insumos') {
        return {
          doc: jest.fn(() => ({
            get: catalogDocGet,
            update: catalogDocUpdate,
          })),
        };
      }

      if (name === 'consumo_insumos') {
        return {
          add: consumoAdd,
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsumosService,
        {
          provide: FirebaseService,
          useValue: { getFirestore: jest.fn(() => mockFirestore) },
        },
        {
          provide: UsuariosService,
          useValue: { findAssignableById },
        },
      ],
    }).compile();

    service = module.get<InsumosService>(InsumosService);
    jest.clearAllMocks();
  });

  it('acepta usuario elegible y persiste consumo', async () => {
    findAssignableById.mockResolvedValue({ id: 'USR-003', nombre: 'Juan Castro', rol: 'personal', activo: true });
    catalogDocGet.mockResolvedValue({
      exists: true,
      id: 'INS-001',
      data: () => ({
        nombre: 'Pintura',
        codigo: 'INS-001',
        unidadMedida: 'litros',
        costoUnitario: 10,
        consumoPromedioPorOT: 2,
        stockActual: 100,
      }),
    });
    consumoAdd.mockResolvedValue({ id: 'cons-1' });

    const result = await service.registrarConsumo({
      ordenTrabajoId: 'OT-1',
      insumoId: 'INS-001',
      cantidad: 2,
      tecnicoId: 'USR-003',
      tecnicoNombre: 'Nombre ignorado',
      areaId: 'TALLER',
    });

    expect(result.id).toBe('cons-1');
    expect(result.tecnicoNombre).toBe('Juan Castro');
    expect(consumoAdd).toHaveBeenCalledTimes(1);
    expect(catalogDocUpdate).toHaveBeenCalledWith({ stockActual: 98 });
  });

  it('rechaza usuario no elegible con 400 y no persiste', async () => {
    findAssignableById.mockRejectedValue(new Error('not assignable'));

    await expect(
      service.registrarConsumo({
        ordenTrabajoId: 'OT-1',
        insumoId: 'INS-001',
        cantidad: 1,
        tecnicoId: 'USR-999',
        tecnicoNombre: 'No Elegible',
        areaId: 'TALLER',
      }),
    ).rejects.toThrow(new BadRequestException('Usuario no elegible para asignación de insumos/EPP'));

    expect(consumoAdd).not.toHaveBeenCalled();
  });
});
