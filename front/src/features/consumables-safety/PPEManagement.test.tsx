import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PPEManagement } from './PPEManagement';

const mocks = vi.hoisted(() => ({
  getEntregasEPP: vi.fn(),
  getCatalogoEPP: vi.fn(),
  createEntregaEPP: vi.fn(),
  getUsuariosAsignables: vi.fn(),
  getAreas: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@shared/context/AssetContext', () => ({
  useRole: () => 'tecnico',
}));

vi.mock('@shared/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'AUTH-1', nombre: 'Operador Actual' } }),
}));

vi.mock('@shared/components', () => ({
  Pagination: () => null,
  ModalShell: ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null),
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
  getEntregasEPP: mocks.getEntregasEPP,
  getCatalogoEPP: mocks.getCatalogoEPP,
  createEntregaEPP: mocks.createEntregaEPP,
}));

vi.mock('../../services/usuariosService', () => ({
  getUsuariosAsignables: mocks.getUsuariosAsignables,
}));

vi.mock('../../services/assetService', () => ({
  getAreas: mocks.getAreas,
}));

describe('PPEManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEntregasEPP.mockResolvedValue([]);
    mocks.getCatalogoEPP.mockResolvedValue([
      {
        id: 'EPP-1',
        nombre: 'Guantes nitrilo',
        tipo: 'guantes-nitrilo',
        frecuenciaReposicionDias: 30,
        costoUnitario: 12,
      },
    ]);
    mocks.getUsuariosAsignables.mockResolvedValue([
      { id: 'USR-1', nombre: 'Juan Castro', area: 'TALLER', rol: 'personal', activo: true },
      { id: 'USR-2', nombre: 'Carlos Mendoza', area: 'PINTURA', rol: 'tecnico', activo: true },
    ]);
    mocks.getAreas.mockResolvedValue([{ id: 'TALLER', nombre: 'Taller' }]);
    mocks.createEntregaEPP.mockResolvedValue({
      id: 'ent-1',
      eppId: 'EPP-1',
      eppNombre: 'Guantes nitrilo',
      eppTipo: 'guantes-nitrilo',
      tecnicoId: 'USR-1',
      tecnicoNombre: 'Juan Castro',
      areaId: 'TALLER',
      cantidad: 2,
      fechaEntrega: '2026-01-01',
      proximaReposicion: '2026-02-01',
      esExtraordinaria: false,
      firmaDigitalTecnico: true,
      entregadoPor: 'AUTH-1',
      entregadoPorNombre: 'Operador Actual',
    });
  });

  it('filtra por asignables y envía payload separando tecnico vs entregadoPor', async () => {
    render(<PPEManagement />);

    await waitFor(() => expect(mocks.getUsuariosAsignables).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Nueva Entrega EPP/i }));

    const modalTitle = await screen.findByRole('heading', { name: /Nueva Entrega EPP/i });
    const modal = modalTitle.closest('div')?.parentElement?.parentElement;
    if (!modal) throw new Error('Modal no encontrado');

    const selects = within(modal).getAllByRole('combobox');
    const eppSelect = selects[0];
    const tecnicoSelect = selects[1];
    const areaSelect = selects[2];
    const cantidadInput = within(modal).getByPlaceholderText('Ej: 2');

    expect(screen.getByRole('option', { name: /Juan Castro — personal/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Carlos Mendoza — tecnico/i })).toBeInTheDocument();

    fireEvent.change(eppSelect, { target: { value: 'EPP-1' } });
    fireEvent.change(tecnicoSelect, { target: { value: 'USR-1' } });
    fireEvent.change(areaSelect, { target: { value: 'TALLER' } });
    fireEvent.change(cantidadInput, { target: { value: '2' } });

    fireEvent.click(within(modal).getByRole('button', { name: /Registrar Entrega/i }));

    await waitFor(() => {
      expect(mocks.createEntregaEPP).toHaveBeenCalledWith(
        expect.objectContaining({
          tecnicoId: 'USR-1',
          tecnicoNombre: 'Juan Castro',
          entregadoPor: 'AUTH-1',
          entregadoPorNombre: 'Operador Actual',
        }),
      );
    });
  });
});
