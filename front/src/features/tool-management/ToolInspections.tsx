import { useState, useEffect } from 'react';
import {
  Camera,
  AlertTriangle,
  CheckCircle2,
  Plus,
  FileText,
  Eye,
  XCircle,
  CalendarDays,
  MapPin,
  User,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useRole } from '@shared/context/AssetContext';
import { InspeccionFotografica } from '../../data/mockData';
import { getInspecciones, createInspeccion } from '../../services/toolService';
import { getUsuarios } from '../../services/usuariosService';
import { getAreas } from '../../services/assetService';

/** Normaliza una discrepancia (puede venir como string del mock o como objeto del backend) */
function discText(d: unknown): string {
  if (typeof d === 'string') return d;
  if (d && typeof d === 'object' && 'descripcion' in d) return (d as { descripcion: string }).descripcion;
  return String(d);
}

export function ToolInspections() {
  const role = useRole();
  const [inspecciones, setInspecciones] = useState<InspeccionFotografica[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNuevaModal, setShowNuevaModal] = useState(false);
  const [showComparadorModal, setShowComparadorModal] = useState<InspeccionFotografica | null>(null);
  const [showReporteModal, setShowReporteModal] = useState<InspeccionFotografica | null>(null);

  const [tecnicos, setTecnicos] = useState<string[]>([]);
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);

  const [formNueva, setFormNueva] = useState({
    tecnico: '',
    ubicacion: '',
    discrepancias: [] as string[],
    observaciones: '',
  });

  const [discrepanciaInput, setDiscrepanciaInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      getInspecciones(),
      getUsuarios().catch(() => []),
      getAreas().catch(() => []),
    ]).then(([insData, usuarios, areas]) => {
      setInspecciones(insData);
      setTecnicos(usuarios.map(u => u.nombre));
      setUbicaciones(areas.map(a => a.nombre));
      setLoading(false);
    });
  }, []);

  const totalInspecciones = inspecciones.length;
  const conDiscrepancias = inspecciones.filter((i) => i.tieneDiscrepancias).length;
  const reportesGenerados = inspecciones.filter((i) => i.reporteGenerado).length;

  const handleGuardarInspeccion = async () => {
    if (!formNueva.tecnico || !formNueva.ubicacion) return;
    setSaving(true);
    try {
      const payload: Omit<InspeccionFotografica, 'id'> = {
        tecnico: formNueva.tecnico,
        inspeccionadoPor: formNueva.tecnico,
        fechaInspeccion: new Date().toISOString().slice(0, 10),
        ubicacion: formNueva.ubicacion,
        fotoActualUrl: '',
        fotoBaseUrl: '',
        discrepancias: formNueva.discrepancias,
        tieneDiscrepancias: formNueva.discrepancias.length > 0,
        reporteGenerado: false,
        observaciones: formNueva.observaciones,
      };
      const created = await createInspeccion(payload);
      setInspecciones((prev) => [created, ...prev]);
      setFormNueva({ tecnico: '', ubicacion: '', discrepancias: [], observaciones: '' });
      setDiscrepanciaInput('');
      setShowNuevaModal(false);
    } catch (err) {
      console.error('[ToolInspections] Error al guardar inspección:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerarReporte = (ins: InspeccionFotografica) => {
    setInspecciones((prev) =>
      prev.map((i) => (i.id === ins.id ? { ...i, reporteGenerado: true } : i))
    );
    setShowReporteModal({ ...ins, reporteGenerado: true });
  };

  return (
    <div className="p-6 space-y-6">
      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-100 border border-slate-200 rounded-xl p-4 h-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-100 border border-slate-200 rounded-xl h-64" />
            ))}
          </div>
        </div>
      ) : (
      <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Camera className="text-amber-500" size={28} />
            Inspecciones Fotográficas — C9
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Evidencia de custodia y detección de discrepancias · F9.1 · F9.2 · F9.3
          </p>
        </div>
        {(role === 'tecnico') && (
          <button
            onClick={() => setShowNuevaModal(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Plus size={16} />
            Nueva Inspección (F9.1)
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <Camera className="text-slate-500" size={24} />
          <div>
            <p className="text-2xl font-bold text-slate-700">{totalInspecciones}</p>
            <p className="text-xs text-slate-500 font-medium">Inspecciones Registradas</p>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-orange-500" size={24} />
          <div>
            <p className="text-2xl font-bold text-orange-700">{conDiscrepancias}</p>
            <p className="text-xs text-orange-600 font-medium">Con Discrepancias</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <ShieldAlert className="text-red-500" size={24} />
          <div>
            <p className="text-2xl font-bold text-red-700">{reportesGenerados}</p>
            <p className="text-xs text-red-600 font-medium">Reportes para Seguridad</p>
          </div>
        </div>
      </div>

      {/* Grid de inspecciones — F9.1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {inspecciones.map((ins) => (
          <div
            key={ins.id}
            className={`bg-white border rounded-xl overflow-hidden shadow-sm ${
              ins.tieneDiscrepancias ? 'border-orange-300' : 'border-slate-200'
            }`}
          >
            {/* Foto */}
            <div className="relative h-40 overflow-hidden">
              <img
                src={ins.fotoActualUrl}
                alt={`Caja ${ins.tecnico}`}
                className="w-full h-full object-cover"
              />
              {ins.tieneDiscrepancias && (
                <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <AlertTriangle size={11} />
                  {ins.discrepancias.length} discrepancia{ins.discrepancias.length > 1 ? 's' : ''}
                </div>
              )}
              {!ins.tieneDiscrepancias && (
                <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={11} />
                  OK
                </div>
              )}
              {ins.reporteGenerado && (
                <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <ShieldAlert size={11} />
                  Reporte
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" />
                  <span className="font-semibold text-slate-800 text-sm">{ins.tecnico}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <CalendarDays size={11} />
                  {ins.fechaInspeccion}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin size={11} />
                {ins.ubicacion}
              </div>
              {ins.observaciones && (
                <p className="text-xs text-slate-500 italic">"{ins.observaciones}"</p>
              )}
              {ins.discrepancias.length > 0 && (
                <div className="space-y-1">
                  {ins.discrepancias.map((d, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50 rounded px-2 py-1">
                      <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                      {discText(d)}
                    </div>
                  ))}
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2 pt-1">
                {ins.fotoBaseUrl && (
                  <button
                    onClick={() => setShowComparadorModal(ins)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    <Eye size={13} />
                    Comparar (F9.2)
                  </button>
                )}
                {ins.tieneDiscrepancias && !ins.reporteGenerado && role === 'jefe' && (
                  <button
                    onClick={() => handleGenerarReporte(ins)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-red-500 hover:bg-red-600 text-white py-1.5 rounded-lg transition-colors font-medium"
                  >
                    <FileText size={13} />
                    Reporte (F9.3)
                  </button>
                )}
                {ins.reporteGenerado && (
                  <button
                    onClick={() => setShowReporteModal(ins)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-red-50 border border-red-200 text-red-700 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    <FileText size={13} />
                    Ver Reporte
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold flex items-center gap-2 mb-1">
          <Camera size={16} />
          F9.1 — Fotografía Semanal de Cajas
        </p>
        <p className="text-amber-700">
          El Técnico Líder fotografía semanalmente el contenido de cada caja de herramientas. Cada imagen queda almacenada con fecha, técnico responsable y ubicación. Sirve como evidencia objetiva ante incidentes.
        </p>
      </div>

      {/* ─── MODAL: Nueva Inspección F9.1 ─── */}
      {showNuevaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Camera className="text-amber-500" size={20} />
                Registrar Inspección Fotográfica — F9.1
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Técnico (propietario de la caja) *</label>
                <select
                  value={formNueva.tecnico}
                  onChange={(e) => setFormNueva((f) => ({ ...f, tecnico: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">Seleccionar técnico...</option>
                  {tecnicos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ubicación *</label>
                <select
                  value={formNueva.ubicacion}
                  onChange={(e) => setFormNueva((f) => ({ ...f, ubicacion: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">Seleccionar ubicación...</option>
                  {ubicaciones.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Discrepancias detectadas (F9.2)</label>
                <div className="flex gap-2">
                  <input
                    value={discrepanciaInput}
                    onChange={(e) => setDiscrepanciaInput(e.target.value)}
                    placeholder="Describir discrepancia..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    onClick={() => {
                      if (discrepanciaInput && !formNueva.discrepancias.includes(discrepanciaInput)) {
                        setFormNueva((f) => ({ ...f, discrepancias: [...f.discrepancias, discrepanciaInput] }));
                        setDiscrepanciaInput('');
                      }
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Añadir
                  </button>
                </div>
                {formNueva.discrepancias.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {formNueva.discrepancias.map((d, i) => (
                      <div key={i} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded px-3 py-1.5 text-xs text-orange-800">
                        <span>{d}</span>
                        <button
                          onClick={() => setFormNueva((f) => ({ ...f, discrepancias: f.discrepancias.filter((_, j) => j !== i) }))}
                          className="text-orange-500 hover:text-orange-700"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Observaciones adicionales..."
                  value={formNueva.observaciones}
                  onChange={(e) => setFormNueva((f) => ({ ...f, observaciones: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowNuevaModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarInspeccion}
                disabled={saving}
                className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Guardando...' : 'Guardar Inspección'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Comparador Visual F9.2 ─── */}
      {showComparadorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="text-amber-500" size={20} />
                  Comparador Visual de Inventario — F9.2
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Caja de: <strong>{showComparadorModal.tecnico}</strong> · {showComparadorModal.fechaInspeccion}
                </p>
              </div>
              <button onClick={() => setShowComparadorModal(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 text-center uppercase tracking-wider">📷 Foto Base (Referencia)</p>
                  <img
                    src={showComparadorModal.fotoBaseUrl}
                    alt="Foto base"
                    className="w-full h-48 object-cover rounded-xl border-2 border-emerald-300"
                  />
                  <p className="text-xs text-center text-emerald-700 mt-1 font-medium">Estado esperado</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 text-center uppercase tracking-wider">📷 Foto Actual ({showComparadorModal.fechaInspeccion})</p>
                  <img
                    src={showComparadorModal.fotoActualUrl}
                    alt="Foto actual"
                    className={`w-full h-48 object-cover rounded-xl border-2 ${showComparadorModal.tieneDiscrepancias ? 'border-orange-400' : 'border-emerald-400'}`}
                  />
                  <p className={`text-xs text-center mt-1 font-medium ${showComparadorModal.tieneDiscrepancias ? 'text-orange-700' : 'text-emerald-700'}`}>
                    {showComparadorModal.tieneDiscrepancias ? 'Discrepancias detectadas' : 'Sin discrepancias'}
                  </p>
                </div>
              </div>

              {showComparadorModal.discrepancias.length > 0 ? (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="font-semibold text-orange-800 flex items-center gap-2 mb-2 text-sm">
                    <AlertTriangle size={16} />
                    Diferencias Identificadas (resaltadas automáticamente)
                  </p>
                  <ul className="space-y-1.5">
                    {showComparadorModal.discrepancias.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-orange-700">
                        <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold mt-0.5">{i + 1}</span>
                        {discText(d)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-500" size={24} />
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">Sin diferencias detectadas</p>
                    <p className="text-emerald-700 text-xs">La caja coincide con el estado de referencia.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Reporte F9.3 ─── */}
      {showReporteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="text-red-500" size={20} />
                  Reporte de Discrepancias — F9.3
                </h2>
                <p className="text-xs text-slate-500 mt-1">Para Seguridad / Recursos Humanos</p>
              </div>
              <button onClick={() => setShowReporteModal(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs space-y-2 text-slate-700">
                <p className="font-bold text-slate-900 text-sm">REPORTE OFICIAL DE DISCREPANCIAS</p>
                <p>Fecha: <strong>{showReporteModal.fechaInspeccion}</strong></p>
                <p>Técnico inspeccionado: <strong>{showReporteModal.tecnico}</strong></p>
                <p>Inspeccionado por: <strong>{showReporteModal.inspeccionadoPor}</strong></p>
                <p>Ubicación: <strong>{showReporteModal.ubicacion}</strong></p>
                <hr className="border-slate-300" />
                <p className="font-semibold text-orange-800">Faltantes / Discrepancias Detectadas:</p>
                <ol className="list-decimal list-inside space-y-1">
                  {showReporteModal.discrepancias.map((d, i) => (
                    <li key={i} className="text-orange-700">{discText(d)}</li>
                  ))}
                </ol>
                <hr className="border-slate-300" />
                <p className="text-slate-500">Evidencia fotográfica adjunta · Reporte generado por SURMOTOR v1.0</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                <span className="font-semibold">Estado:</span> Reporte generado y disponible para el área de Seguridad / RRHH. Este documento puede ser usado como evidencia formal en procesos disciplinarios.
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowReporteModal(null)}
                className="px-4 py-2 text-sm bg-red-50 border border-red-200 text-red-700 font-semibold rounded-lg hover:bg-red-100 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info roles */}
      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap gap-4">
        <span>🟨 <strong>Técnico Líder:</strong> Fotografiar cajas (F9.1), comparar con foto base (F9.2)</span>
        <span>🟩 <strong>Jefe de Taller:</strong> Generar reporte oficial de discrepancias para Seguridad / RRHH (F9.3)</span>
      </div>
      </>
      )}
    </div>
  );
}
