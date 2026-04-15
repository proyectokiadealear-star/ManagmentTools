// catalogo-visual.service.spec.ts — Tests Jest para búsqueda, estadísticas y disponibilidad
import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';
import { FirebaseService } from '../firebase/firebase.service';
import { NotFoundException } from '@nestjs/common';
import { LocationsService } from '../locations/locations.service';

const mockFirebaseService = {
  getFirestore: jest.fn(),
};

const mockLocationsService = {
  findAreaById: jest.fn(),
};

// Factory para construir un mock de activo completo
function buildActivo(overrides: Partial<any> = {}) {
  return {
    id: 'activo-1',
    nombre: 'Llave de Torque Digital',
    tipo: 'Herramienta',
    marca: 'Stanley',
    modelo: 'ST-450',
    serial: 'SN-001',
    placa: 'PL-001',
    areaId: 'area-mecanica',
    bahiaId: 'bahia-2',
    rackId: 'rack-a',
    cajaId: 'caja-003',
    custodio: 'Carlos Ruiz',
    estado: 'activo',
    estadoOperativo: 'disponible',
    capacidad: '150 Nm',
    especificaciones: 'Llave digital con torquímetro de precisión',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Mock de Firestore reutilizable — retorna lista de activos
function makeMockFirestore(activos: any[]) {
  return {
    collection: jest.fn(() => ({
      get: jest.fn().mockResolvedValue({
        docs: activos.map(a => ({ id: a.id, data: () => a })),
        empty: activos.length === 0,
      }),
      doc: jest.fn((id: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          id,
          data: () => activos.find(a => a.id === id) ?? null,
        }),
      })),
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ empty: true }),
        })),
        orderBy: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
        })),
        get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
      })),
      add: jest.fn().mockResolvedValue({ id: 'new-id' }),
    })),
  };
}

describe('AssetsService — Catálogo Visual', () => {
  let service: AssetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: LocationsService, useValue: mockLocationsService },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    jest.clearAllMocks();
    mockLocationsService.findAreaById.mockResolvedValue({ id: 'area-default', sede: 'SURMOTOR' });
  });

  // ─── 6.1 search() ─────────────────────────────────────────────────────────

  describe('search()', () => {
    const activos = [
      buildActivo({ id: '1', nombre: 'Llave de Torque Digital', tipo: 'Herramienta', estadoOperativo: 'disponible', areaId: 'area-mecanica', sede: 'SURMOTOR' }),
      buildActivo({ id: '2', nombre: 'Multímetro Digital', tipo: 'Herramienta', estadoOperativo: 'en-prestamo', areaId: 'area-mecanica', sede: 'SURMOTOR' }),
      buildActivo({ id: '3', nombre: 'Elevador Hidráulico', tipo: 'Elevador', estadoOperativo: 'disponible', capacidad: '3.5 toneladas', areaId: 'area-mecanica', sede: 'SURMOTOR' }),
      buildActivo({ id: '4', nombre: 'Compresor Industrial', tipo: 'Compresor', estadoOperativo: 'en-mantenimiento', areaId: 'area-pintura', sede: 'SHYRIS' }),
    ];

    beforeEach(() => {
      mockFirebaseService.getFirestore.mockReturnValue(makeMockFirestore(activos));
      mockLocationsService.findAreaById.mockImplementation(async (id: string) => {
        if (id === 'area-mecanica') return { id, sede: 'SURMOTOR' };
        if (id === 'area-pintura') return { id, sede: 'SHYRIS' };
        return { id, sede: 'SURMOTOR' };
      });
    });

    it('debe retornar todos los activos cuando no hay filtros', async () => {
      const result = await service.search({}, {});
      expect(result).toHaveLength(4);
    });

    it('debe filtrar por búsqueda de texto (nombre)', async () => {
      const result = await service.search({ q: 'Llave de Torque' }, {});
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some(a => a.nombre === 'Llave de Torque Digital')).toBe(true);
    });

    it('debe filtrar por búsqueda de texto (tipo)', async () => {
      const result = await service.search({ q: 'digital' }, {});
      expect(result.length).toBeGreaterThanOrEqual(2); // Llave de Torque Digital + Multímetro Digital
    });

    it('debe filtrar por tipo exacto', async () => {
      const result = await service.search({}, { tipo: 'Elevador' });
      expect(result).toHaveLength(1);
      expect(result[0].nombre).toBe('Elevador Hidráulico');
    });

    it('debe filtrar por estadoOperativo = disponible', async () => {
      const result = await service.search({}, { estadoOperativo: 'disponible' });
      expect(result).toHaveLength(2);
      result.forEach(a => expect(a.estadoOperativo).toBe('disponible'));
    });

    it('debe filtrar por capacidad', async () => {
      const result = await service.search({}, { capacidad: '3.5 toneladas' });
      expect(result).toHaveLength(1);
      expect(result[0].nombre).toBe('Elevador Hidráulico');
    });

    it('debe combinar tipo + estadoOperativo (Scenario 4: Técnico Líder)', async () => {
      const result = await service.search({}, { tipo: 'Elevador', estadoOperativo: 'disponible' });
      expect(result).toHaveLength(1);
      expect(result[0].tipo).toBe('Elevador');
      expect(result[0].estadoOperativo).toBe('disponible');
    });

    it('debe retornar array vacío si no hay coincidencias', async () => {
      const result = await service.search({ q: 'xyz-no-existe' }, {});
      expect(result).toHaveLength(0);
    });

    it('debe buscar por placa', async () => {
      const result = await service.search({ q: 'PL-001' }, {});
      expect(result.length).toBeGreaterThan(0);
    });

    it('debe filtrar solo por sede', async () => {
      const result = await service.search({}, { sede: 'surmotor' } as any);
      expect(result).toHaveLength(3);
      result.forEach(a => expect((a as any).sede).toBe('SURMOTOR'));
    });

    it('debe filtrar por combinación sede + area válida', async () => {
      const result = await service.search({}, { sede: 'SURMOTOR', areaId: 'area-mecanica' } as any);
      expect(result).toHaveLength(3);
      result.forEach(a => expect(a.areaId).toBe('area-mecanica'));
    });

    it('debe retornar vacío en combinación sede + area incompatible', async () => {
      const result = await service.search({}, { sede: 'SURMOTOR', areaId: 'area-pintura' } as any);
      expect(result).toEqual([]);
    });
  });

  // ─── 6.2 getEstadisticas() ────────────────────────────────────────────────

  describe('getEstadisticas()', () => {
    it('debe retornar estadísticas correctas del taller (Scenario 3: Vista General)', async () => {
      const activos = [
        buildActivo({ id: '1', estadoOperativo: 'disponible', cajaId: null, custodio: null }),
        buildActivo({ id: '2', estadoOperativo: 'en-prestamo', cajaId: null }),
        buildActivo({ id: '3', estadoOperativo: 'en-mantenimiento', cajaId: null }),
        buildActivo({ id: '4', estadoOperativo: 'danado', cajaId: null }),
        buildActivo({ id: '5', estadoOperativo: 'disponible', cajaId: 'caja-001', custodio: 'Carlos Ruiz' }),
      ];
      mockFirebaseService.getFirestore.mockReturnValue(makeMockFirestore(activos));

      const result = await service.getEstadisticas();

      expect(result.total).toBe(5);
      expect(result.disponibles).toBe(2);
      expect(result.enPrestamo).toBe(1);
      expect(result.enMantenimiento).toBe(1);
      expect(result.danados).toBe(1);
      expect(result.enCajasPersonales).toBe(1);
    });

    it('debe retornar ceros si no hay activos', async () => {
      mockFirebaseService.getFirestore.mockReturnValue(makeMockFirestore([]));

      const result = await service.getEstadisticas();

      expect(result.total).toBe(0);
      expect(result.disponibles).toBe(0);
      expect(result.enPrestamo).toBe(0);
    });
  });

  // ─── 6.3 getDisponibilidad() ──────────────────────────────────────────────

  describe('getDisponibilidad()', () => {
    it('debe indicar disponible = true cuando estadoOperativo es disponible', async () => {
      const activo = buildActivo({ id: 'activo-1', estadoOperativo: 'disponible' });
      mockFirebaseService.getFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: true, id: 'activo-1', data: () => activo }),
          })),
        })),
      });

      const result = await service.getDisponibilidad('activo-1');

      expect(result.disponible).toBe(true);
      expect(result.estadoOperativo).toBe('disponible');
      expect(result.mensaje).toContain('disponible');
    });

    it('debe indicar disponible = false cuando estadoOperativo es en-prestamo', async () => {
      const activo = buildActivo({ id: 'activo-2', estadoOperativo: 'en-prestamo' });
      mockFirebaseService.getFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: true, id: 'activo-2', data: () => activo }),
          })),
        })),
      });

      const result = await service.getDisponibilidad('activo-2');

      expect(result.disponible).toBe(false);
      expect(result.estadoOperativo).toBe('en-prestamo');
    });

    it('debe indicar disponible = false cuando estadoOperativo es danado', async () => {
      const activo = buildActivo({ id: 'activo-3', estadoOperativo: 'danado' });
      mockFirebaseService.getFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: true, id: 'activo-3', data: () => activo }),
          })),
        })),
      });

      const result = await service.getDisponibilidad('activo-3');

      expect(result.disponible).toBe(false);
      expect(result.mensaje).toContain('dañado');
    });

    it('debe lanzar NotFoundException si el activo no existe', async () => {
      mockFirebaseService.getFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: false }),
          })),
        })),
      });

      await expect(service.getDisponibilidad('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('debe verificar disponibilidad en tiempo real (Scenario 2: Personal de Taller)', async () => {
      // Simula que el sistema verifica si la herramienta sigue disponible
      const activo = buildActivo({ id: 'multimetro-1', nombre: 'Multímetro Digital', estadoOperativo: 'disponible' });
      mockFirebaseService.getFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: true, id: 'multimetro-1', data: () => activo }),
          })),
        })),
      });

      const result = await service.getDisponibilidad('multimetro-1');

      expect(result.id).toBe('multimetro-1');
      expect(result.disponible).toBe(true);
    });
  });
});
