/**
 * Button — reusable button component.
 *
 * Variants:
 *   primary   — solid colored button (default color: blue)
 *   secondary — white/outline button (cancel style)
 *   ghost     — no border/background
 *
 * Colors (for primary):  blue | amber | rose | green | slate
 *
 * Usage:
 *   <Button variant="primary" color="amber" onClick={handleSave}>Guardar</Button>
 *   <Button variant="secondary" onClick={onClose}>Cancelar</Button>
 */
import { ReactNode, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonColor = 'blue' | 'amber' | 'rose' | 'green' | 'slate';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  children: ReactNode;
}

const colorMap: Record<ButtonColor, string> = {
  blue:  'bg-blue-600  hover:bg-blue-700  text-white',
  amber: 'bg-amber-600 hover:bg-amber-700 text-white',
  rose:  'bg-rose-600  hover:bg-rose-700  text-white',
  green: 'bg-green-600 hover:bg-green-700 text-white',
  slate: 'bg-slate-600 hover:bg-slate-700 text-white',
};

export function Button({
  variant = 'primary',
  color = 'blue',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-[transform,background-color,border-color,opacity] duration-150 ease-out active:scale-[0.97] disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClass =
    variant === 'primary'
      ? colorMap[color]
      : variant === 'secondary'
      ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
      : 'text-slate-600 hover:bg-slate-100';

  return (
    <button className={`${base} ${variantClass} ${className}`} {...rest}>
      {children}
    </button>
  );
}
