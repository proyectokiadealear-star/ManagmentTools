import { useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  History,
  Pen,
  User,
  Package,
  CalendarClock,
  FileSignature,
} from 'lucide-react';
import { useAssets, useRole } from '@shared/context/AssetContext';
import {
  SolicitudPrestamo,
  mockPrestamos,
  EstadoSolicitudPrestamo,
} from '../../data/mockData';

const PERSONAL_OPTIONS = [
  'Pedro Alvarado',
  'Juan Morales',
  'Roberto Gómez',
  'Ana Torres',
  'Miguel Sánchez',
  'Luis Pérez',
];

const estadoBadge: Record<EstadoSolicitudPrestamo, { label: string; cls: string; icon: React.ReactNode }> = {
  Pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock size={12} /> },
  Aprobado: { label: 'En Uso', cls: 'bg-blue-100 text-blue-800 border-blue-200', icon: <CheckCircle2 size={12} /> },
  Rechazado: { label: 'Rechazado', cls: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle size={12} /> },
  Devuelto: { label: 'Devuelto', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  Vencido: { label: 'Vencido', cls: 'bg-orange-100 text-orange-800 border-orange-200', icon: <AlertTriangle size={12} /> },
};

export function ToolLoans() {
  const assets = useAssets();
  const role = useRole();
  const [prestamos, setPrestamos] = useState<SolicitudPrestamo[]>(mockPrestamos);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<EstadoSolicitudPrestamo | 'Todos'>('Todos');
  const [showSolicitudModal, setShowSolicitudModal] = useState(false);
  const [showAprobacionModal, setShowAprobacionModal] = useState<SolicitudPrestamo | null>(null);
  const [showHistorialModal, setShowHistorialModal] = useState<string | null>(null); // assetId

  // Formulario nueva solicitud (F8.1)
  const [formSolicitud, setFormSolicitud] = useState({
    assetId: '',
    ordenTrabajo: '',
    motivoUso: '',
    fechaDevolucionEstimada: '',
  });

  // Formulario aprobación (F8.2)
  const [formAprobacion, setFormAprobacion] = useState({ aprobar: true, motivoRechazo: '' });

  const filtered = prestamos.filter((p) => {
    const matchSearch =
      p.assetDescripcion.toLowerCase().includes(search.toLowerCase()) ||
      p.solicitante.toLowerCase().includes(search.toLowerCase()) ||
      p.ordenTrabajo.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === 'Todos' || p.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const pendientes = prestamos.filter((p) => p.estado === 'Pendiente').length;
  const enUso = prestamos.filter((p) => p.estado === 'Aprobado').length;
  const vencidos = prestamos.filter((p) => p.estado === 'Vencido').length;

  const handleCrearSolicitud = () => {
    if (!formSolicitud.assetId || !formSolicitud.ordenTrabajo || !formSolicitud.motivoUso || !formSolicitud.fechaDevolucionEstimada) return;
    const asset = assets.find((a) => a.id === formSolicitud.assetId);
    const nuevaSolicitud: SolicitudPrestamo = {
      id: `PR-${String(prestamos.length + 1).padStart(3, '0')}`,
      assetId: formSolicitud.assetId,
      assetDescripcion: asset?.descripcion ?? '',
      assetPlaca: asset?.placa ?? '',
      solicitante: role === 'personal' ? 'Pedro Alvarado' : 'Carlos Mendoza',
      ordenTrabajo: formSolicitud.ordenTrabajo,
      motivoUso: formSolicitud.motivoUso,
      fechaSolicitud: new Date().toISOString(),
      fechaDevolucionEstimada: formSolicitud.fechaDevolucionEstimada,
      estado: 'Pendiente',
    };
    setPrestamos((prev) => [nuevaSolicitud, ...prev]);
    setFormSolicitud({ assetId: '', ordenTrabajo: '', motivoUso: '', fechaDevolucionEstimada: '' });
    setShowSolicitudModal(false);
  };

  const handleAprobar = (prestamo: SolicitudPrestamo) => {
    const now = new Date().toISOString();
    const aprobadoPor = 'Carlos Mendoza';
    if (formAprobacion.aprobar) {
      setPrestamos((prev) =>
        prev.map((p) =>
          p.id === prestamo.id
            ? {
                ...p,
                estado: 'Aprobado',
                fechaAprobacion: now,
                aprobadoPor,
                firmaDigital: `${aprobadoPor} — ${now.slice(0, 16).replace('T', ' ')}`,
                fechaSalida: now,
              }
            : p
        )
      );
    } else {
      setPrestamos((prev) =>
        prev.map((p) =>
          p.id === prestamo.id
            ? { ...p, estado: 'Rechazado', motivoRechazo: formAprobacion.motivoRechazo }
            : p
        )
      );
    }
    setShowAprobacionModal(null);
    setFormAprobacion({ aprobar: true, motivoRechazo: '' });
  };

  const historialAsset = showHistorialModal
    ? prestamos.filter((p) => p.assetId === showHistorialModal)
    : [];
  const historialAssetDesc = showHistorialModal
    ? assets.find((a) => a.id === showHistorialModal)?.descripcion ?? ''
    : '';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="text-amber-500" size={28} />
            Control de Préstamos — C8
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Trazabilidad completa de herramientas prestadas · F8.1 · F8.2 · F8.3 · F8.4
          </p>
        </div>
        {(role === 'personal' || role === 'tecnico') && (
          <button
            onClick={() => setShowSolicitudModal(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Plus size={16} />
            Nueva Solicitud (F8.1)
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Clock className="text-amber-500" size={24} />
          <div>
            <p className="text-2xl font-bold text-amber-700">{pendientes}</p>
            <p className="text-xs text-amber-600 font-medium">Solicitudes Pendientes</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Package className="text-blue-500" size={24} />
          <div>
            <p className="text-2xl font-bold text-blue-700">{enUso}</p>
            <p className="text-xs text-blue-600 font-medium">Herramientas en Uso</p>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-orange-500" size={24} />
          <div>
            <p className="text-2xl font-bold text-orange-700">{vencidos}</p>
            <p className="text-xs text-orange-600 font-medium">Devoluciones Vencidas</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por herramienta, técnico u OT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value as EstadoSolicitudPrestamo | 'Todos')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        >
          <option value="Todos">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Aprobado">En Uso</option>
          <option value="Vencido">Vencido</option>
          <option value="Devuelto">Devuelto</option>
          <option value="Rechazado">Rechazado</option>
        </select>
      </div>

      {/* Tabla de préstamos — F8.3 timestamps + F8.4 historial */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Herramienta</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Solicitante</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">OT</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Solicitud (F8.3)</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Devolución Est.</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Estado</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No hay solicitudes registradas.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const badge = estadoBadge[p.estado];
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.assetDescripcion}</p>
                      <p className="text-xs text-slate-400">{p.assetPlaca}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        <span className="text-slate-700">{p.solicitante}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.ordenTrabajo}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{p.fechaSolicitud.slice(0, 10)}</p>
                      <p className="text-xs text-slate-400">{p.fechaSolicitud.slice(11, 16)}</p>
                      {p.fechaSalida && (
                        <p className="text-xs text-blue-500">Salida: {p.fechaSalida.slice(11, 16)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.fechaDevolucionEstimada}
                      {p.fechaDevolucionReal && (
                        <p className="text-xs text-emerald-600">
                          Real: {p.fechaDevolucionReal.slice(11, 16)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${badge.cls}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>
                      {p.firmaDigital && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                          <FileSignature size={10} />
                          {p.aprobadoPor}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* F8.2 Aprobación — solo tecnico/jefe y si está Pendiente */}
                        {(role === 'tecnico' || role === 'jefe') && p.estado === 'Pendiente' && (
                          <button
                            onClick={() => setShowAprobacionModal(p)}
                            className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-2 py-1.5 rounded-lg transition-colors font-medium"
                          >
                            <Pen size={12} />
                            Aprobar (F8.2)
                          </button>
                        )}
                        {/* F8.4 Historial por herramienta */}
                        {(role === 'jefe') && (
                          <button
                            onClick={() => setShowHistorialModal(p.assetId)}
                            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2 py-1.5 rounded-lg transition-colors font-medium"
                          >
                            <History size={12} />
                            Historial
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Firma digital info — F8.2 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold flex items-center gap-2 mb-1">
          <FileSignature size={16} />
          F8.2 — Firma Digital del Técnico Líder
        </p>
        <p className="text-blue-700">
          Cada aprobación registra automáticamente el nombre del Técnico Líder + fecha y hora exacta como firma digital. Esta información queda asociada permanentemente al préstamo.
        </p>
      </div>

      {/* ─── MODAL: Nueva Solicitud F8.1 ─── */}
      {showSolicitudModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="text-amber-500" size={20} />
                Solicitar Herramienta — F8.1
              </h2>
              <p className="text-xs text-slate-500 mt-1">Portal de solicitud · Pendiente de aprobación del Técnico Líder</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Herramienta / Activo *</label>
                <select
                  value={formSolicitud.assetId}
                  onChange={(e) => setFormSolicitud((f) => ({ ...f, assetId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">Seleccionar herramienta...</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.descripcion} ({a.placa})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Orden de Trabajo (OT) *</label>
                <input
                  type="text"
                  placeholder="Ej: OT-2025-0250"
                  value={formSolicitud.ordenTrabajo}
                  onChange={(e) => setFormSolicitud((f) => ({ ...f, ordenTrabajo: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo de Uso *</label>
                <textarea
                  rows={3}
                  placeholder="Describe para qué necesitas esta herramienta..."
                  value={formSolicitud.motivoUso}
                  onChange={(e) => setFormSolicitud((f) => ({ ...f, motivoUso: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Estimada de Devolución *</label>
                <input
                  type="date"
                  value={formSolicitud.fechaDevolucionEstimada}
                  onChange={(e) => setFormSolicitud((f) => ({ ...f, fechaDevolucionEstimada: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowSolicitudModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearSolicitud}
                className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
              >
                Enviar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Aprobación F8.2 ─── */}
      {showAprobacionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSignature className="text-emerald-500" size={20} />
                Aprobar / Rechazar Solicitud — F8.2
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-slate-500" />
                  <span className="font-semibold">{showAprobacionModal.assetDescripcion}</span>
                  <span className="text-slate-400">({showAprobacionModal.assetPlaca})</span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-slate-500" />
                  <span>Solicitante: <strong>{showAprobacionModal.solicitante}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarClock size={14} className="text-slate-500" />
                  <span>OT: <strong>{showAprobacionModal.ordenTrabajo}</strong></span>
                </div>
                <p className="text-slate-600 italic">"{showAprobacionModal.motivoUso}"</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setFormAprobacion((f) => ({ ...f, aprobar: true }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${
                    formAprobacion.aprobar
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  Aprobar
                </button>
                <button
                  onClick={() => setFormAprobacion((f) => ({ ...f, aprobar: false }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${
                    !formAprobacion.aprobar
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <XCircle size={16} />
                  Rechazar
                </button>
              </div>
              {!formAprobacion.aprobar && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo de Rechazo</label>
                  <textarea
                    rows={3}
                    placeholder="Explica el motivo del rechazo..."
                    value={formAprobacion.motivoRechazo}
                    onChange={(e) => setFormAprobacion((f) => ({ ...f, motivoRechazo: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <span className="font-semibold">Firma Digital: </span>
                Se registrará automáticamente — <strong>Carlos Mendoza</strong> · {new Date().toLocaleString('es-EC')}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowAprobacionModal(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleAprobar(showAprobacionModal)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors text-white ${
                  formAprobacion.aprobar
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {formAprobacion.aprobar ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Historial por herramienta F8.4 ─── */}
      {showHistorialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="text-amber-500" size={20} />
                  Historial de Préstamos — F8.4
                </h2>
                <p className="text-xs text-slate-500 mt-1">{historialAssetDesc}</p>
              </div>
              <button
                onClick={() => setShowHistorialModal(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle size={22} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {historialAsset.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Sin historial para esta herramienta.</p>
              ) : (
                <div className="space-y-3">
                  {historialAsset.map((p) => {
                    const badge = estadoBadge[p.estado];
                    return (
                      <div key={p.id} className="border border-slate-200 rounded-lg p-4 text-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-slate-500" />
                            <span className="font-semibold text-slate-800">{p.solicitante}</span>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.cls}`}>
                            {badge.icon}
                            {badge.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-600">
                          <div><span className="text-slate-400">OT:</span> {p.ordenTrabajo}</div>
                          <div><span className="text-slate-400">Solicitud:</span> {p.fechaSolicitud.slice(0, 16).replace('T', ' ')}</div>
                          {p.fechaSalida && <div><span className="text-slate-400">Salida:</span> {p.fechaSalida.slice(11, 16)}</div>}
                          {p.fechaDevolucionReal && <div><span className="text-slate-400">Devolución:</span> {p.fechaDevolucionReal.slice(11, 16)}</div>}
                          {p.aprobadoPor && <div><span className="text-slate-400">Aprobó:</span> {p.aprobadoPor}</div>}
                          {p.estadoDevolucion && <div><span className="text-slate-400">Estado devuelto:</span> {p.estadoDevolucion}</div>}
                        </div>
                        <p className="text-slate-500 italic">"{p.motivoUso}"</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info box roles */}
      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap gap-4">
        <span>🟦 <strong>Personal:</strong> Solicitar herramientas (F8.1)</span>
        <span>🟨 <strong>Técnico Líder:</strong> Aprobar/rechazar con firma digital (F8.2), ver timestamps (F8.3)</span>
        <span>🟩 <strong>Jefe de Taller:</strong> Historial completo por herramienta (F8.4)</span>
      </div>
      <div className="hidden">{PERSONAL_OPTIONS.join('')}</div>
    </div>
  );
}
