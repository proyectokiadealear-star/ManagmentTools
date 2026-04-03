import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  ClipboardList,
} from 'lucide-react';
import { useAssets, useRole } from '@shared/context/AssetContext';
import {
  SolicitudPrestamo,
  ActaDevolucion,
} from '../../data/mockData';
import { getPrestamos, getActas } from '../../services/toolService';
import { formatCurrency } from '@shared/utils/formatters';
import { ActaModal } from './ActaModal';
import { DevolucionModal } from './DevolucionModal';
import { NominaModal } from './NominaModal';
import { Pagination } from '@shared/components';
import { usePagination } from '@shared/hooks/usePagination';

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Main Component ───────────────────────────────────────────────────────────

export function ToolDevolution() {
  const assets = useAssets();
  const role = useRole();
  // Actas initialized empty — populated via service
  const [actas, setActas] = useState<ActaDevolucion[]>([]);

  // Active loans: populated via service (only those with estado === 'Aprobado')
  const [activePrestamos, setActivePrestamos] = useState<SolicitudPrestamo[]>([]);

  // Loading state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getActas(),
      getPrestamos('Aprobado').catch(() => []),
    ]).then(([actasData, prestamosData]) => {
      setActas(actasData);
      setActivePrestamos(prestamosData);
      setLoading(false);
    });
  }, []);

  // KPIs
  const totalActas = actas.length;
  const conDanoOIncompletas = actas.filter(
    (a) => a.estadoAlDevolver === 'Dañada' || a.estadoAlDevolver === 'Incompleta'
  ).length;
  const docsNomina = actas.filter((a) => a.documentoNominaGenerado).length;

  // Penalty actas (for jefe)
  const penaltyActas = actas.filter((a) => a.requiereDescuento);

  // Pagination — active loans
  const {
    paginatedItems: pagePrestamos,
    currentPage: prestPage, pageSize: prestPageSize,
    setCurrentPage: setPrestPage, setPageSize: setPrestPageSize,
    totalItems: totalPrestamos,
  } = usePagination(activePrestamos, 10);

  // Pagination — actas
  const {
    paginatedItems: pageActas,
    currentPage: actasPage, pageSize: actasPageSize,
    setCurrentPage: setActasPage, setPageSize: setActasPageSize,
    totalItems: totalActasPag,
  } = usePagination(actas, 10);

  // Pagination — penalty actas
  const {
    paginatedItems: pagePenaltyActas,
    currentPage: penPage, pageSize: penPageSize,
    setCurrentPage: setPenPage, setPageSize: setPenPageSize,
    totalItems: totalPenalty,
  } = usePagination(penaltyActas, 10);

  // Modal state
  const [actaModalPrestamo, setActaModalPrestamo] = useState<SolicitudPrestamo | null>(null);
  const [devolucionModalActa, setDevolucionModalActa] = useState<ActaDevolucion | null>(null);
  const [nominaModalActa, setNominaModalActa] = useState<ActaDevolucion | null>(null);

  // Handlers
  function handleEmitirActa(newActa: ActaDevolucion) {
    setActas((prev) => [...prev, newActa]);
  }

  function handleGuardarDevolucion(updated: ActaDevolucion) {
    setActas((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  function handleGenerarNomina(actaId: string) {
    setActas((prev) =>
      prev.map((a) => (a.id === actaId ? { ...a, documentoNominaGenerado: true } : a))
    );
    const updated = actas.find((a) => a.id === actaId);
    if (updated) {
      setNominaModalActa({ ...updated, documentoNominaGenerado: true });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-xl">
          <ShieldCheck className="text-amber-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Responsabilidad en Devolución — C10
          </h1>
          <p className="text-sm text-gray-500">
            Actas de entrega-recepción, registro de estado y descuentos por daño
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-100 rounded-xl">
            <ClipboardList className="text-amber-500" size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalActas}</p>
            <p className="text-xs text-gray-500 font-medium">Actas Emitidas</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-red-100 rounded-xl">
            <AlertTriangle className="text-red-500" size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{conDanoOIncompletas}</p>
            <p className="text-xs text-gray-500 font-medium">Con Daño / Incompletas</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <DollarSign className="text-emerald-500" size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{docsNomina}</p>
            <p className="text-xs text-gray-500 font-medium">Docs. de Nómina Generados</p>
          </div>
        </div>
      </div>

      {/* ── Section 1: F10.1 / F10.2 ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-amber-50">
          <h2 className="text-base font-bold text-gray-800">
            Préstamos Activos y Actas (F10.1 / F10.2)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Genera actas para préstamos aprobados y registra el estado de devolución
          </p>
        </div>

        {/* Active loans table */}
        <div className="px-6 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FileText size={15} className="text-amber-400" />
            Préstamos Activos (Aprobados)
          </h3>
          {activePrestamos.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">
              No hay préstamos activos en este momento.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Activo
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Placa
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Solicitante
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      OT
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Dev. Estimada
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagePrestamos.map((prestamo) => {
                    const alreadyHasActa = actas.some(
                      (a) => a.solicitudPrestamoId === prestamo.id
                    );
                    return (
                      <tr key={prestamo.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {prestamo.assetDescripcion}
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                          {prestamo.assetPlaca}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{prestamo.solicitante}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                          {prestamo.ordenTrabajo}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {prestamo.fechaDevolucionEstimada}
                        </td>
                        <td className="px-4 py-3">
                          {alreadyHasActa ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                              <CheckCircle size={12} />
                              Acta emitida
                            </span>
                          ) : (
                            <button
                              onClick={() => setActaModalPrestamo(prestamo)}
                              className="inline-flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <FileText size={12} />
                              Generar Acta
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-gray-100">
                <Pagination
                  currentPage={prestPage}
                  pageSize={prestPageSize}
                  totalItems={totalPrestamos}
                  onPageChange={setPrestPage}
                  onPageSizeChange={setPrestPageSize}
                />
              </div>
            </div>
          )}
        </div>

        {/* Generated actas list */}
        <div className="px-6 pt-4 pb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <RotateCcw size={15} className="text-amber-400" />
            Actas Generadas — Registro de Devolución
          </h3>
          {actas.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">
              No hay actas generadas aún.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Acta
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Activo
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Técnico
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Descuento
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageActas.map((acta) => {
                    const isDamaged =
                      acta.estadoAlDevolver === 'Dañada' ||
                      acta.estadoAlDevolver === 'Incompleta';
                    return (
                      <tr key={acta.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {acta.id}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {acta.assetDescripcion}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{acta.tecnico}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              isDamaged
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : acta.estadoAlDevolver === 'Nueva'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {acta.estadoAlDevolver}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {acta.requiereDescuento ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold">
                              <AlertTriangle size={12} />
                              Sí —{' '}
                              {acta.valorReposicion !== undefined
                                ? formatCurrency(acta.valorReposicion)
                                : '—'}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!acta.documentoNominaGenerado && (
                            <button
                              onClick={() => setDevolucionModalActa(acta)}
                              className="inline-flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-800 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <RotateCcw size={12} />
                              Registrar Devolución
                            </button>
                          )}
                          {acta.documentoNominaGenerado && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                              <CheckCircle size={12} />
                              Nómina generada
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-gray-100">
                <Pagination
                  currentPage={actasPage}
                  pageSize={actasPageSize}
                  totalItems={totalActasPag}
                  onPageChange={setActasPage}
                  onPageSizeChange={setActasPageSize}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: F10.3 — Jefe only ── */}
      {role === 'jefe' && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 bg-red-50">
            <h2 className="text-base font-bold text-gray-800">
              Descuentos y Reposición (F10.3)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Solo visible para Jefe de Taller — Gestión de descuentos de nómina por daño o
              pérdida
            </p>
          </div>

          <div className="p-6">
            {penaltyActas.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle size={40} className="mx-auto mb-2 text-emerald-300" />
                <p className="text-sm">No hay activos con descuentos pendientes.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Activo
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Técnico
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Valor Reposición
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Documento
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagePenaltyActas.map((acta) => (
                      <tr key={acta.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {acta.assetDescripcion}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{acta.tecnico}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                            {acta.estadoAlDevolver}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-red-600">
                          {acta.valorReposicion !== undefined
                            ? formatCurrency(acta.valorReposicion)
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {acta.documentoNominaGenerado ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                              <CheckCircle size={12} />
                              Doc. Generado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                              <AlertTriangle size={12} />
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!acta.documentoNominaGenerado ? (
                            <button
                              onClick={() => handleGenerarNomina(acta.id)}
                              className="inline-flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <DollarSign size={12} />
                              Generar Doc. Nómina
                            </button>
                          ) : (
                            <button
                              onClick={() => setNominaModalActa(acta)}
                              className="inline-flex items-center gap-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <FileText size={12} />
                              Ver Documento
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-gray-100">
                  <Pagination
                    currentPage={penPage}
                    pageSize={penPageSize}
                    totalItems={totalPenalty}
                    onPageChange={setPenPage}
                    onPageSizeChange={setPenPageSize}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {actaModalPrestamo && (
        <ActaModal
          prestamo={actaModalPrestamo}
          onClose={() => setActaModalPrestamo(null)}
          onEmitir={handleEmitirActa}
          assets={assets}
        />
      )}

      {devolucionModalActa && (
        <DevolucionModal
          acta={devolucionModalActa}
          onClose={() => setDevolucionModalActa(null)}
          onGuardar={handleGuardarDevolucion}
          assets={assets}
        />
      )}

      {nominaModalActa && (
        <NominaModal
          acta={nominaModalActa}
          onClose={() => setNominaModalActa(null)}
        />
      )}
    </div>
  );
}
