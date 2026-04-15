import { Test, TestingModule } from '@nestjs/testing';
import { CatalogosService } from './catalogos.service';
import { FirebaseService } from '../firebase/firebase.service';

describe('CatalogosService — sedes base', () => {
  let service: CatalogosService;

  const addMock = jest.fn();
  const getAllMock = jest.fn();
  const getSedeMock = jest.fn();

  const mockFirestore = {
    collection: jest.fn((name: string) => {
      if (name !== 'catalogos') {
        throw new Error(`Unexpected collection: ${name}`);
      }

      return {
        add: addMock,
        where: jest.fn((field: string, _op: string, value: string) => {
          if (field === 'catalogo' && value === 'sede') {
            return { get: getSedeMock };
          }
          return { get: getAllMock };
        }),
        get: getAllMock,
      };
    }),
  };

  const mockFirebaseService = {
    getFirestore: jest.fn(() => mockFirestore),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogosService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<CatalogosService>(CatalogosService);
    jest.clearAllMocks();
  });

  it('asegura sedes base al consultar catálogo de sedes (incluye SHYRIS)', async () => {
    getSedeMock
      .mockResolvedValueOnce({
        docs: [
          { data: () => ({ nombre: 'SURMOTOR' }) },
          { data: () => ({ nombre: 'GRANDA CENTENO' }) },
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          { id: '1', data: () => ({ catalogo: 'sede', nombre: 'SURMOTOR', activo: true, createdAt: 'x', updatedAt: 'x' }) },
          { id: '2', data: () => ({ catalogo: 'sede', nombre: 'GRANDA_CENTENO', activo: true, createdAt: 'x', updatedAt: 'x' }) },
          { id: '3', data: () => ({ catalogo: 'sede', nombre: 'SHYRIS', activo: true, createdAt: 'x', updatedAt: 'x' }) },
        ],
      });

    addMock.mockResolvedValue({ id: 'new-sede' });

    const result = await service.findAll('sede');

    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogo: 'sede',
        nombre: 'SHYRIS',
        activo: true,
      }),
    );
    expect(result.some(item => item.nombre === 'SHYRIS')).toBe(true);
  });

  it('no intenta asegurar sedes base para otros catálogos', async () => {
    getAllMock.mockResolvedValue({ docs: [] });

    await service.findAll('marca');

    expect(addMock).not.toHaveBeenCalled();
  });
});
