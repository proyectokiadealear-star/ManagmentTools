// AssetFilterPanel.tsx — Panel lateral de filtros del catálogo
import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { SearchParams } from '../../services/assetService';
import { AreaAPI } from '../../services/assetService';

interface AssetFilterPanelProps {
  filtros: SearchParams;
  areas: AreaAPI[];
  sedesCatalogo: string[];
  tiposDisponibles: string[];
  onChange: (filtros: SearchParams) => void;
  onReset: () => void;
}

const ESTADOS_OPERATIVOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'disponible', label: '✅ Disponible' },
  { value: 'en-prestamo', label: '🕐 En Préstamo' },
  { value: 'en-mantenimiento', label: '🔧 En Mantenimiento' },
  { value: 'danado', label: '⚠️ Dañado' },
];

export const AssetFilterPanel: React.FC<AssetFilterPanelProps> = ({
  filtros,
  areas,
  sedesCatalogo,
  tiposDisponibles,
  onChange,
  onReset,
}) => {
  const normalizarSede = (value?: string): string | undefined => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .toUpperCase();
  };

  const sedesDisponibles = React.useMemo(
    () => Array.from(
      new Set(
        sedesCatalogo
          .map(s => normalizarSede(s))
          .filter((s): s is string => !!s),
      ),
    ).sort(),
    [sedesCatalogo],
  );

  const hayFiltros = !!(filtros.tipo || filtros.estadoOperativo || filtros.areaId || filtros.sede || filtros.capacidad);

  return (
    <aside className="w-full md:w-64 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-5 h-fit">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
          Filtros
        </div>
        {hayFiltros && (
          <button
            onClick={onReset}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {/* Tipo de activo */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tipo de activo</label>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={filtros.tipo ?? ''}
          onChange={e => onChange({ ...filtros, tipo: e.target.value || undefined })}
        >
          <option value="">Todos los tipos</option>
          {tiposDisponibles.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Estado operativo */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Estado operativo</label>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={filtros.estadoOperativo ?? ''}
          onChange={e => onChange({ ...filtros, estadoOperativo: e.target.value || undefined })}
        >
          {ESTADOS_OPERATIVOS.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
      </div>

      {/* Área */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sede</label>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={filtros.sede ?? ''}
          onChange={e => {
            const nextSede = e.target.value || undefined;
            const areaSeleccionada = areas.find(a => a.id === filtros.areaId);
            const areaIncompatible =
              !!nextSede &&
              !!areaSeleccionada &&
              normalizarSede(areaSeleccionada.sede) !== normalizarSede(nextSede);

            onChange({
              ...filtros,
              sede: nextSede,
              areaId: areaIncompatible ? undefined : filtros.areaId,
            });
          }}
        >
          <option value="">Todas las sedes</option>
          {sedesDisponibles.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Área */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Área del taller</label>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={filtros.areaId ?? ''}
          onChange={e => onChange({ ...filtros, areaId: e.target.value || undefined })}
        >
          <option value="">Todas las áreas</option>
          {areas
            .filter(a => !filtros.sede || normalizarSede(a.sede) === normalizarSede(filtros.sede))
            .map(a => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
      </div>

      {/* Capacidad */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Capacidad / Especificación</label>
        <input
          type="text"
          placeholder="Ej: 3.5 toneladas"
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={filtros.capacidad ?? ''}
          onChange={e => onChange({ ...filtros, capacidad: e.target.value || undefined })}
        />
      </div>
    </aside>
  );
};
