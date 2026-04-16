import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EppService } from './epp.service';
import { FirebaseService } from '../firebase/firebase.service';
import { UsuariosService } from '../usuarios/usuarios.service';

describe('EppService — validación de elegibilidad', () => {
  let service: EppService;

  const catalogDocGet = jest.fn();
  const catalogDocUpdate = jest.fn();
  const entregasAdd = jest.fn();
  const findAssignableById = jest.fn();

  const mockFirestore = {
    collection: jest.fn((name: string) => {
      if (name === 'catalogo_epp') {
        return {
          doc: jest.fn(() => ({
            get: catalogDocGet,
            update: catalogDocUpdate,
          })),
        };
      }

      if (name === 'entregas_epp') {
        return {
          add: entregasAdd,
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              orderBy: jest.fn(() => ({
                limit: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: true }) })),
              })),
            })),
          })),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EppService,
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

    service = module.get<EppService>(EppService);
    jest.clearAllMocks();
  });

  it('acepta usuario elegible y persiste entrega', async () => {
    findAssignableById.mockResolvedValue({ id: 'USR-003', nombre: 'Juan Castro', rol: 'personal', activo: true });
    catalogDocGet.mockResolvedValue({
      exists: true,
      id: 'EPP-001',
      data: () => ({
        nombre: 'Guantes',
        tipo: 'guantes-nitrilo',
        frecuenciaReposicionDias: 30,
        costoUnitario: 10,
        stockActual: 50,
      }),
    });
    entregasAdd.mockResolvedValue({ id: 'ent-1' });

    const result = await service.registrarEntrega({
      eppId: 'EPP-001',
      tecnicoId: 'USR-003',
      tecnicoNombre: 'Nombre ignorado',
      areaId: 'TALLER',
      cantidad: 2,
      esExtraordinaria: false,
      entregadoPor: 'USR-001',
      entregadoPorNombre: 'Encargado',
    });

    expect(result.id).toBe('ent-1');
    expect(result.tecnicoNombre).toBe('Juan Castro');
    expect(entregasAdd).toHaveBeenCalledTimes(1);
    expect(catalogDocUpdate).toHaveBeenCalledWith({ stockActual: 48 });
  });

  it('rechaza usuario no elegible con 400 y no persiste', async () => {
    findAssignableById.mockRejectedValue(new Error('not assignable'));

    await expect(
      service.registrarEntrega({
        eppId: 'EPP-001',
        tecnicoId: 'USR-999',
        tecnicoNombre: 'No Elegible',
        areaId: 'TALLER',
        cantidad: 1,
        esExtraordinaria: false,
        entregadoPor: 'USR-001',
        entregadoPorNombre: 'Encargado',
      }),
    ).rejects.toThrow(new BadRequestException('Usuario no elegible para asignación de insumos/EPP'));

    expect(entregasAdd).not.toHaveBeenCalled();
  });
});
