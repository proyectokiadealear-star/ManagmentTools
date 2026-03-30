/**
 * Badge — reusable status/label badge.
 *
 * Renders a small pill-shaped label. Pass a `className` with the
 * desired color classes (bg-*, text-*, border-*), or use the
 * pre-built `variant` shortcuts.
 *
 * Usage:
 *   <Badge className="bg-green-100 text-green-700 border-green-200">Activo</Badge>
 *   <Badge variant="warning">Pendiente</Badge>
 */
import { ReactNode } from 'react';

type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  success: 'bg-green-100  text-green-700  border-green-200',
  warning: 'bg-amber-100  text-amber-700  border-amber-200',
  danger:  'bg-red-100    text-red-700    border-red-200',
  info:    'bg-blue-100   text-blue-700   border-blue-200',
  neutral: 'bg-slate-100  text-slate-600  border-slate-200',
};

export function Badge({ children, variant, className = '' }: BadgeProps) {
  const variantClass = variant ? variantMap[variant] : '';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${variantClass} ${className}`}
    >
      {children}
    </span>
  );
}
