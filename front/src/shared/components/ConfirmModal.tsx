/**
 * ConfirmModal — reusable confirmation dialog that replaces window.confirm.
 *
 * Props:
 *   isOpen       — controls visibility
 *   onClose      — called when user cancels or clicks backdrop
 *   onConfirm    — called when user confirms
 *   title        — modal heading (default: '¿Confirmar acción?')
 *   message      — body text explaining what will happen
 *   confirmLabel — label for the confirm button (default: 'Confirmar')
 *   cancelLabel  — label for the cancel button (default: 'Cancelar')
 *   variant      — 'danger' (red confirm) | 'warning' (amber) | 'default' (blue)
 */
import { AlertTriangle, Trash2, AlertCircle } from 'lucide-react';
import { ModalShell } from './ModalShell';

type Variant = 'danger' | 'warning' | 'default';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
}

const variantStyles: Record<Variant, { icon: React.ReactNode; confirmBtn: string; iconBg: string }> = {
  danger: {
    icon: <Trash2 size={22} className="text-rose-600" />,
    confirmBtn: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white',
    iconBg: 'bg-rose-50 border border-rose-100',
  },
  warning: {
    icon: <AlertTriangle size={22} className="text-amber-600" />,
    confirmBtn: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400 text-white',
    iconBg: 'bg-amber-50 border border-amber-100',
  },
  default: {
    icon: <AlertCircle size={22} className="text-blue-600" />,
    confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
    iconBg: 'bg-blue-50 border border-blue-100',
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Confirmar acción?',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
}: ConfirmModalProps) {
  const styles = variantStyles[variant];

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <div className="p-6 flex flex-col items-center text-center gap-4">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${styles.iconBg}`}>
          {styles.icon}
        </div>

        {/* Text */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-1">{title}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${styles.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
