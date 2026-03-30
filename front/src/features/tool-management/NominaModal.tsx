import { DollarSign, X } from 'lucide-react';
import { ActaDevolucion } from '../../data/mockData';
import { formatCurrency } from '@shared/utils/formatters';

interface NominaModalProps {
  acta: ActaDevolucion;
  onClose: () => void;
}

export function NominaModal({ acta, onClose }: NominaModalProps) {
  const today = new Date().toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <DollarSign className="text-red-500" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Documento de Nómina</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <pre className="font-mono text-xs bg-gray-50 border border-gray-300 rounded-lg p-4 whitespace-pre-wrap text-gray-800 leading-relaxed">
{`════════════════════════════════════════════
     SURMOTOR — DESCUENTO POR DAÑO DE ACTIVO
════════════════════════════════════════════

Nro. Documento : ${acta.id}-NOM
Fecha          : ${today}

TÉCNICO        : ${acta.tecnico}
ACTIVO         : ${acta.assetDescripcion}
ESTADO         : ${acta.estadoAlDevolver}

VALOR REPOSICIÓN: ${acta.valorReposicion !== undefined ? formatCurrency(acta.valorReposicion) : 'N/D'}

OBSERVACIONES  : ${acta.observaciones ?? 'Sin observaciones'}

────────────────────────────────────────────
Descuento autorizado por Jefe de Taller.
El monto será descontado de nómina según
política de responsabilidad de activos de
SURMOTOR vigente.
────────────────────────────────────────────
Firma Jefe de Taller: ____________________
════════════════════════════════════════════`}
          </pre>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-lg transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
