import { useState } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle, Camera, X } from 'lucide-react';
import { ActaDevolucion, EstadoDevolucion, Asset } from '../../data/mockData';
import { calcDepreciation } from '@shared/utils/depreciation';
import { formatCurrency } from '@shared/utils/formatters';

interface DevolucionModalProps {
  acta: ActaDevolucion;
  onClose: () => void;
  onGuardar: (updated: ActaDevolucion) => void;
  assets: Asset[];
}

export function DevolucionModal({ acta, onClose, onGuardar, assets }: DevolucionModalProps) {
  const asset = assets.find((a) => a.id === acta.assetId);
  const [estado, setEstado] = useState<EstadoDevolucion>(acta.estadoAlDevolver);
  const [observaciones, setObservaciones] = useState(acta.observaciones ?? '');

  const requiereDescuento = estado === 'Dañada' || estado === 'Incompleta';
  const valorReposicion = requiereDescuento && asset
    ? calcDepreciation(asset.valor, asset.fechaCompra, asset.vidaUtil).currentValue
    : undefined;

  function handleGuardar() {
    const updated: ActaDevolucion = {
      ...acta,
      estadoAlDevolver: estado,
      observaciones,
      requiereDescuento,
      valorReposicion,
    };
    onGuardar(updated);
    onClose();
  }

  const estadoOptions: EstadoDevolucion[] = ['Nueva', 'Usada Normal', 'Dañada', 'Incompleta'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <RotateCcw className="text-amber-500" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Registrar Devolución</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-sm font-bold text-gray-800">{acta.assetDescripcion}</p>
            <p className="text-xs text-gray-500">Técnico: {acta.tecnico}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Estado al Devolver</label>
            <div className="grid grid-cols-2 gap-2">
              {estadoOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setEstado(opt)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    estado === opt
                      ? opt === 'Dañada' || opt === 'Incompleta'
                        ? 'bg-red-100 border-red-400 text-red-700'
                        : 'bg-emerald-100 border-emerald-400 text-emerald-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Camera size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Foto de evidencia (simulado)</span> — En producción el técnico adjuntaría una foto del estado del activo.
            </p>
          </div>
          {requiereDescuento && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <p className="text-sm font-semibold text-red-700">Requiere descuento o reposición</p>
              </div>
              {valorReposicion !== undefined && (
                <p className="text-sm text-red-600 ml-6">
                  Valor de reposición calculado: <span className="font-bold">{formatCurrency(valorReposicion)}</span>
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Describa el estado del activo al momento de la devolución..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            className="px-5 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <CheckCircle size={15} />
            Guardar Devolución
          </button>
        </div>
      </div>
    </div>
  );
}
