import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaterialConsumption } from './MaterialConsumption';

const mocks = vi.hoisted(() => ({
  getConsumos: vi.fn(),
  getCatalogoInsumos: vi.fn(),
  createConsumo: vi.fn(),
  getUsuariosAsignables: vi.fn(),
}));

vi.mock('@shared/context/AssetContext', () => ({
  useRole: () => 'tecnico',
}));

vi.mock('@shared/components', () => ({
  Pagination: () => null,
}));

vi.mock('@shared/hooks/usePagination', () => ({
  usePagination: (items: unknown[]) => ({
    paginatedItems: items,
    currentPage: 1,
    pageSize: 10,
    setCurrentPage: vi.fn(),
    setPageSize: vi.fn(),
    totalItems: items.length,
  }),
}));

vi.mock('../../services/consumablesService', () => ({
  getConsumos: mocks.getConsumos,
  getCatalogoInsumos: mocks.getCatalogoInsumos,
  createConsumo: mocks.createConsumo,
}));

vi.mock('../../services/usuariosService', () => ({
  getUsuariosAsignables: mocks.getUsuariosAsignables,
}));

describe('MaterialConsumption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConsumos.mockResolvedValue([]);
    mocks.getCatalogoInsumos.mockResolvedValue([
      {
        id: 'INS-1',
        nombre: 'Pintura',
        tipo: 'pintura',
        codigo: 'INS-1',
        unidadMedida: 'litros',
        costoUnitario: 10,
        consumoPromedioPorOT: 2,
      },
    ]);
    mocks.getUsuariosAsignables.mockResolvedValue([
      { id: 'USR-1', nombre: 'Juan Castro', area: 'TALLER', rol: 'personal', activo: true },
      { id: 'USR-2', nombre: 'Carlos Mendoza', area: 'PINTURA', rol: 'tecnico', activo: true },
    ]);
    mocks.createConsumo.mockResolvedValue({
      id: 'cons-1',
      ordenTrabajo: 'OT-001',
      tecnico: 'Juan Castro',
      fecha: '2026-01-01',
      insumo: 'Pintura',
      categoria: 'INS-1',
      cantidad: 2,
      unidad: 'litros',
      costoUnitario: 10,
      costoTotal: 20,
    });
  });

  it('muestra usuarios asignables y envía payload con tecnicoId/tecnicoNombre reales', async () => {
    render(<MaterialConsumption />);

    await waitFor(() => expect(mocks.getUsuariosAsignables).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Registrar Consumo Técnico/i }));

    const modalTitle = await screen.findByText(/Registrar Consumo de Insumo Técnico/i);
    const modal = modalTitle.closest('div')?.parentElement?.parentElement;
    if (!modal) throw new Error('Modal no encontrado');

    const comboboxes = within(modal).getAllByRole('combobox');
    const insumoSelect = comboboxes[0];
    const userSelect = comboboxes[1];

    expect(screen.getByRole('option', { name: /Juan Castro/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Carlos Mendoza/i })).toBeInTheDocument();

    fireEvent.change(within(modal).getByPlaceholderText(/OT-2025-0210/i), { target: { value: 'OT-001' } });
    fireEvent.change(insumoSelect, { target: { value: 'INS-1' } });
    fireEvent.change(userSelect, { target: { value: 'USR-1' } });
    fireEvent.change(within(modal).getByPlaceholderText('0.00'), { target: { value: '2' } });

    fireEvent.click(within(modal).getByRole('button', { name: /Guardar Registro/i }));

    await waitFor(() => {
      expect(mocks.createConsumo).toHaveBeenCalledWith(
        expect.objectContaining({
          ordenTrabajoId: 'OT-001',
          insumoId: 'INS-1',
          tecnicoId: 'USR-1',
          tecnicoNombre: 'Juan Castro',
          areaId: 'TALLER',
        }),
      );
    });
  });

  it('exige justificación cuando la cantidad excede tolerancia y la envía en payload', async () => {
    render(<MaterialConsumption />);

    await waitFor(() => expect(mocks.getUsuariosAsignables).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Registrar Consumo Técnico/i }));

    const modalTitle = await screen.findByText(/Registrar Consumo de Insumo Técnico/i);
    const modal = modalTitle.closest('div')?.parentElement?.parentElement;
    if (!modal) throw new Error('Modal no encontrado');

    const comboboxes = within(modal).getAllByRole('combobox');
    const insumoSelect = comboboxes[0];
    const userSelect = comboboxes[1];

    fireEvent.change(within(modal).getByPlaceholderText(/OT-2025-0210/i), { target: { value: 'OT-002' } });
    fireEvent.change(insumoSelect, { target: { value: 'INS-1' } });
    fireEvent.change(userSelect, { target: { value: 'USR-1' } });
    fireEvent.change(within(modal).getByPlaceholderText('0.00'), { target: { value: '3' } });

    fireEvent.click(within(modal).getByRole('button', { name: /Guardar Registro/i }));

    expect(await within(modal).findByText(/Se requiere justificación/i)).toBeInTheDocument();
    expect(mocks.createConsumo).not.toHaveBeenCalled();

    fireEvent.change(
      within(modal).getByPlaceholderText(/Explique motivo/i),
      { target: { value: 'Consumo extraordinario por retrabajo' } },
    );

    fireEvent.click(within(modal).getByRole('button', { name: /Guardar Registro/i }));

    await waitFor(() => {
      expect(mocks.createConsumo).toHaveBeenCalledWith(
        expect.objectContaining({
          ordenTrabajoId: 'OT-002',
          cantidad: 3,
          tecnicoId: 'USR-1',
          justificacion: 'Consumo extraordinario por retrabajo',
        }),
      );
    });
  });
});
