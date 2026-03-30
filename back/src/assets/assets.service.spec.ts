import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';
import { FirebaseService } from '../firebase/firebase.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockFirebaseService = {
  getFirestore: jest.fn(),
};

const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
    add: jest.fn(),
    where: jest.fn(() => ({
      limit: jest.fn(() => ({
        get: jest.fn(),
      })),
      orderBy: jest.fn(() => ({
        get: jest.fn(),
      })),
      get: jest.fn(),
    })),
    get: jest.fn(),
  })),
};

describe('AssetsService', () => {
  let service: AssetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of activos', async () => {
      const mockActivos = [
        { id: '1', nombre: 'Activo 1', tipo: 'Equipo' },
        { id: '2', nombre: 'Activo 2', tipo: 'Herramienta' },
      ];
      
      mockFirestore.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: mockActivos.map(a => ({ id: a.id, data: () => a })),
        }),
      } as any);

      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(mockFirestore.collection).toHaveBeenCalledWith('activos');
    });
  });

  describe('findOne', () => {
    it('should return a single activo', async () => {
      const mockActivo = { id: '1', nombre: 'Activo 1', tipo: 'Equipo' };
      
      mockFirestore.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockActivo,
          }),
        })),
      } as any);

      const result = await service.findOne('1');
      expect(result).toEqual(mockActivo);
    });

    it('should throw NotFoundException if activo not found', async () => {
      mockFirestore.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ exists: false }),
        })),
      } as any);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new activo', async () => {
      const createDto = {
        nombre: 'Nuevo Activo',
        tipo: 'Equipo',
        areaId: 'area-1',
        bahiaId: 'bahia-1',
        rackId: 'rack-1',
      };

      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ empty: true }),
          })),
        })),
        add: jest.fn().mockResolvedValue({ id: 'new-id' }),
      } as any);

      const result = await service.create(createDto, 'user-1');
      expect(result.nombre).toBe('Nuevo Activo');
      expect(result.usuarioId).toBe('user-1');
    });

    it('should throw ConflictException if location occupied', async () => {
      const createDto = {
        nombre: 'Nuevo Activo',
        tipo: 'Equipo',
        areaId: 'area-1',
        bahiaId: 'bahia-1',
        rackId: 'rack-1',
      };

      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ empty: false, docs: [{ id: 'existing' }] }),
          })),
        })),
      } as any);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('validarUbicacionOcupada', () => {
    it('should return true if location is occupied', async () => {
      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ empty: false }),
          })),
        })),
      } as any);

      const result = await service.validarUbicacionOcupada('area-1', 'bahia-1', 'rack-1');
      expect(result).toBe(true);
    });

    it('should return false if location is free', async () => {
      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ empty: true }),
          })),
        })),
      } as any);

      const result = await service.validarUbicacionOcupada('area-1', 'bahia-1', 'rack-1');
      expect(result).toBe(false);
    });
  });
});
