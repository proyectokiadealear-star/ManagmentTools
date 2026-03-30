import { Test, TestingModule } from '@nestjs/testing';
import { LocationsService } from './locations.service';
import { FirebaseService } from '../firebase/firebase.service';

const mockFirebaseService = {
  getFirestore: jest.fn(),
};

const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
    })),
    where: jest.fn(() => ({
      orderBy: jest.fn(() => ({
        get: jest.fn(),
      })),
      get: jest.fn(),
    })),
    add: jest.fn(),
    limit: jest.fn(() => ({
      get: jest.fn().mockResolvedValue({ empty: false }),
    })),
    get: jest.fn(),
  })),
};

describe('LocationsService', () => {
  let service: LocationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllAreas', () => {
    it('should return an array of areas', async () => {
      const mockAreas = [
        { id: '1', nombre: 'Mecánica' },
        { id: '2', nombre: 'Enderezado' },
      ];
      
      mockFirestore.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: mockAreas.map(a => ({ id: a.id, data: () => a })),
        }),
      } as any);

      const result = await service.findAllAreas();
      expect(result).toHaveLength(2);
    });
  });

  describe('findBahiasByArea', () => {
    it('should return bahias for a given area', async () => {
      const mockBahias = [
        { id: 'b1', areaId: 'area-1', nombre: 'Bahía-1', numero: 1 },
      ];
      
      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              docs: mockBahias.map(b => ({ id: b.id, data: () => b })),
            }),
          })),
        })),
      } as any);

      const result = await service.findBahiasByArea('area-1');
      expect(result).toHaveLength(1);
      expect(result[0].nombre).toBe('Bahía-1');
    });
  });
});
