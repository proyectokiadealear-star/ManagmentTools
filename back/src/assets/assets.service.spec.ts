import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { FirebaseService } from '../firebase/firebase.service';
import { LocationsService } from '../locations/locations.service';

describe('AssetsService — sede derivada y filtros', () => {
  let service: AssetsService;

  const activosAdd = jest.fn();
  const activosDocGet = jest.fn();
  const activosDocUpdate = jest.fn();
  const movimientosAdd = jest.fn();

  const mockFirestore = {
    collection: jest.fn((name: string) => {
      if (name === 'activos') {
        return {
          add: activosAdd,
          doc: jest.fn(() => ({
            get: activosDocGet,
            update: activosDocUpdate,
          })),
          get: jest.fn().mockResolvedValue({ docs: [] }),
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: true }) })),
            })),
            limit: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: true }) })),
            orderBy: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ docs: [] }) })),
            get: jest.fn().mockResolvedValue({ docs: [] }),
          })),
        };
      }

      if (name === 'movimientos') {
        return {
          add: movimientosAdd,
          where: jest.fn(() => ({
            orderBy: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ docs: [] }) })),
          })),
        };
      }

      if (name === 'programacion_mantenimiento') {
        return {
          add: jest.fn(),
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: true }) })),
            })),
          })),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  };

  const mockFirebaseService = {
    getFirestore: jest.fn(() => mockFirestore),
  };

  const mockLocationsService = {
    findAreaById: jest.fn(),
  };

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
    activosAdd.mockResolvedValue({ id: 'new-asset-id' });
    movimientosAdd.mockResolvedValue({ id: 'mov-1' });
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('derivación obligatoria de sede', () => {
    it('create: persiste sede derivada desde areaId ignorando sede enviada', async () => {
      mockLocationsService.findAreaById.mockResolvedValue({
        id: 'area-norte',
        sede: 'Sede Norte',
      });

      const result = await service.create(
        {
          nombre: 'Scanner',
          tipo: 'Equipo',
          areaId: 'area-norte',
          sede: 'Sede Sur',
        } as any,
        'user-1',
      );

      expect(mockLocationsService.findAreaById).toHaveBeenCalledWith('area-norte');
      expect(activosAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          areaId: 'area-norte',
          sede: 'SEDE_NORTE',
        }),
      );
      expect(result.sede).toBe('SEDE_NORTE');
    });

    it('update: recalcula sede cuando cambia areaId', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'A1',
        nombre: 'Activo',
        tipo: 'Equipo',
        areaId: 'area-origen',
        sede: 'SURMOTOR',
        estado: 'activo',
        estadoOperativo: 'disponible',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      } as any);

      mockLocationsService.findAreaById.mockResolvedValue({
        id: 'area-destino',
        sede: 'Granda Centeno',
      });

      const updated = await service.update('A1', { areaId: 'area-destino' } as any);

      expect(mockLocationsService.findAreaById).toHaveBeenCalledWith('area-destino');
      expect(activosDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          areaId: 'area-destino',
          sede: 'GRANDA_CENTENO',
        }),
      );
      expect(movimientosAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'transferencia',
          motivo: 'Cambio/actualización de sede desde actualización de activo',
          before: expect.objectContaining({
            areaId: 'area-origen',
            sede: 'SURMOTOR',
          }),
          after: expect.objectContaining({
            areaId: 'area-destino',
            sede: 'GRANDA_CENTENO',
          }),
        }),
      );
      expect(updated.sede).toBe('GRANDA_CENTENO');
    });

    it('update: registra motivo explícito y preserva metadatos previos relevantes', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'A1',
        nombre: 'Activo',
        tipo: 'Equipo',
        areaId: 'area-origen',
        sede: 'SURMOTOR',
        bahiaId: 'b-old',
        rackId: 'r-old',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-15',
        usuarioId: 'user-legacy',
        estado: 'activo',
        estadoOperativo: 'disponible',
      } as any);

      mockLocationsService.findAreaById.mockResolvedValue({
        id: 'area-destino',
        sede: 'Shyris',
      });

      await service.update(
        'A1',
        {
          areaId: 'area-destino',
          bahiaId: 'b-new',
          motivoCambioSede: 'Reubicación operativa',
        } as any,
      );

      expect(movimientosAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          motivo: 'Reubicación operativa',
          before: expect.objectContaining({
            areaId: 'area-origen',
            sede: 'SURMOTOR',
            bahiaId: 'b-old',
            rackId: 'r-old',
          }),
          after: expect.objectContaining({
            areaId: 'area-destino',
            sede: 'SHYRIS',
            bahiaId: 'b-new',
            rackId: 'r-old',
          }),
          metadata: {
            previous: expect.objectContaining({
              areaId: 'area-origen',
              sede: 'SURMOTOR',
              updatedAt: '2026-01-15',
            }),
          },
        }),
      );
    });

    it('update: no registra evento cuando no hay cambio de sede/área', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'A1',
        nombre: 'Activo',
        tipo: 'Equipo',
        areaId: 'area-origen',
        sede: 'SURMOTOR',
        estado: 'activo',
        estadoOperativo: 'disponible',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      } as any);

      mockLocationsService.findAreaById.mockResolvedValue({
        id: 'area-origen',
        sede: 'Sur Motor',
      });

      await service.update('A1', { observacion: 'Cambio menor' } as any);

      expect(movimientosAdd).not.toHaveBeenCalled();
    });

    it('transferir: deriva movimiento.hasta.sede y sede final del activo desde area destino', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'A1',
        nombre: 'Activo',
        areaId: 'area-origen',
        sede: 'SURMOTOR',
      } as any);

      mockLocationsService.findAreaById.mockResolvedValue({
        id: 'area-sur',
        sede: 'Shyris',
      });

      const updateSpy = jest
        .spyOn(service, 'update')
        .mockResolvedValue({ id: 'A1', areaId: 'area-sur', sede: 'SHYRIS' } as any);

      await service.transferir(
        'A1',
        { areaId: 'area-sur', motivo: 'Reasignación interna', sede: 'SURMOTOR' } as any,
        'user-1',
        'Usuario Test',
      );

      expect(movimientosAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          hasta: expect.objectContaining({
            areaId: 'area-sur',
            sede: 'SHYRIS',
          }),
        }),
      );

      expect(updateSpy).toHaveBeenCalledWith(
        'A1',
        expect.objectContaining({
          areaId: 'area-sur',
        }),
      );
    });
  });

  describe('rechazo de areaId inexistente sin escrituras parciales', () => {
    it('create: lanza error y no escribe en activos', async () => {
      mockLocationsService.findAreaById.mockRejectedValue(
        new NotFoundException('Área missing no encontrada'),
      );

      await expect(
        service.create({ nombre: 'Activo', tipo: 'Equipo', areaId: 'missing' } as any, 'u1'),
      ).rejects.toThrow(NotFoundException);

      expect(activosAdd).not.toHaveBeenCalled();
    });

    it('update: lanza error y no escribe en activos', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'A1',
        areaId: 'area-old',
        estado: 'activo',
        estadoOperativo: 'disponible',
      } as any);

      mockLocationsService.findAreaById.mockRejectedValue(
        new NotFoundException('Área missing no encontrada'),
      );

      await expect(service.update('A1', { areaId: 'missing' } as any)).rejects.toThrow(
        NotFoundException,
      );

      expect(activosDocUpdate).not.toHaveBeenCalled();
    });

    it('transferir: lanza error y no registra movimiento ni actualización', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'A1',
        nombre: 'Activo',
        areaId: 'area-old',
      } as any);

      mockLocationsService.findAreaById.mockRejectedValue(
        new NotFoundException('Área missing no encontrada'),
      );

      const updateSpy = jest.spyOn(service, 'update');

      await expect(
        service.transferir('A1', { areaId: 'missing', motivo: 'x' } as any, 'u1'),
      ).rejects.toThrow(NotFoundException);

      expect(movimientosAdd).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('filtros sede + area deterministas', () => {
    const activosFixture = [
      { id: '1', areaId: 'area-norte-1', sede: 'SEDE_NORTE', nombre: 'A', tipo: 'T' },
      { id: '2', areaId: 'area-norte-2', sede: 'sede norte', nombre: 'B', tipo: 'T' },
      { id: '3', areaId: 'area-sur-1', sede: 'SEDE_SUR', nombre: 'C', tipo: 'T' },
      { id: '4', areaId: 'area-surmotor-1', sede: 'SUR_MOTOR', nombre: 'D', tipo: 'T' },
      { id: '5', areaId: 'area-surmotor-2', sede: 'SURMOTOR', nombre: 'E', tipo: 'T' },
      { id: '6', areaId: 'area-surmotor-3', sede: ' Sur-Motor ', nombre: 'F', tipo: 'T' },
    ];

    beforeEach(() => {
      jest.spyOn(service, 'findAll').mockResolvedValue(activosFixture as any);
    });

    it('filtro solo por sede retorna únicamente esa sede', async () => {
      const result = await service.search({}, { sede: 'Sede Norte' } as any);
      expect(result.map(a => a.id)).toEqual(['1', '2']);
    });

    it('filtro combinado sede+area coherente retorna coincidencias', async () => {
      mockLocationsService.findAreaById.mockResolvedValue({ id: 'area-norte-1', sede: 'SEDE_NORTE' });

      const result = await service.search(
        {},
        { sede: 'Sede Norte', areaId: 'area-norte-1' } as any,
      );

      expect(result.map(a => a.id)).toEqual(['1']);
    });

    it('combinación inválida sede+area retorna vacío de forma determinista', async () => {
      mockLocationsService.findAreaById.mockResolvedValue({ id: 'area-sur-1', sede: 'SEDE_SUR' });

      const result = await service.search(
        {},
        { sede: 'Sede Norte', areaId: 'area-sur-1' } as any,
      );

      expect(result).toEqual([]);
    });

    it('filtro por SURMOTOR matchea variantes con guion/underscore/espacios', async () => {
      const result = await service.search({}, { sede: 'SURMOTOR' } as any);
      expect(result.map(a => a.id)).toEqual(['4', '5', '6']);
    });

    it('combinación sede+area con SURMOTOR es consistente con comparación normalizada', async () => {
      mockLocationsService.findAreaById.mockResolvedValue({ id: 'area-surmotor-1', sede: 'Sur Motor' });

      const result = await service.search(
        {},
        { sede: 'SURMOTOR', areaId: 'area-surmotor-1' } as any,
      );

      expect(result.map(a => a.id)).toEqual(['4']);
    });
  });
});
