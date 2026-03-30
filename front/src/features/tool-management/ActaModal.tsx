import { FileText, X } from 'lucide-react';
import { SolicitudPrestamo, ActaDevolucion, Asset } from '../../data/mockData';

interface ActaModalProps {
  prestamo: SolicitudPrestamo;
  onClose: () => void;
  onEmitir: (acta: ActaDevolucion) => void;
  assets: Asset[];
}

export function ActaModal({ prestamo, onClose, onEmitir, assets }: ActaModalProps) {
  const asset = assets.find((a) => a.id === prestamo.assetId);
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const isoNow = now.toISOString();

  const CONDITIONS_TEXT =
    'El suscrito declara recibir el activo en perfectas condiciones y se compromete a devolverlo en igual estado. En caso de daño o pérdida, se aplicará descuento de nómina o reposición según valor depreciado vigente.';

  function handleEmitir() {
    const newActa: ActaDevolucion = {
      id: `ACTA-${Date.now()}`,
      solicitudPrestamoId: prestamo.id,
      assetId: prestamo.assetId,
      assetDescripcion: prestamo.assetDescripcion,
      tecnico: prestamo.solicitante,
      firmadoPor: `${prestamo.solicitante} — ${isoNow.slice(0, 16).replace('T', ' ')}`,
      fechaEmision: isoNow,
      condiciones: CONDITIONS_TEXT,
      estadoAlDevolver: 'Usada Normal',
      requiereDescuento: false,
      documentoNominaGenerado: false,
    };
    onEmitir(newActa);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="text-amber-500" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Acta de Responsabilidad</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">Activo</p>
            <p className="text-base font-bold text-gray-800">{prestamo.assetDescripcion}</p>
            <p className="text-sm text-gray-500">Placa: {prestamo.assetPlaca}</p>
            {asset && (
              <p className="text-sm text-gray-500">
                Marca: {asset.marca} — Modelo: {asset.modelo}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Condiciones del Acta</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed border border-gray-200">
              {CONDITIONS_TEXT}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Firma Digital Simulada</p>
            <p className="font-mono text-sm text-gray-800">{prestamo.solicitante}</p>
            <p className="text-xs text-gray-500 mt-1">{dateStr}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Solicitante:</span>
              <p className="font-medium text-gray-800">{prestamo.solicitante}</p>
            </div>
            <div>
              <span className="text-gray-500">Orden de Trabajo:</span>
              <p className="font-medium text-gray-800">{prestamo.ordenTrabajo}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleEmitir}
            className="px-5 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <FileText size={15} />
            Emitir Acta
          </button>
        </div>
      </div>
    </div>
  );
}
