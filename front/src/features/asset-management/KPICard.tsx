import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'amber' | 'green' | 'red' | 'slate';
}
export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue'
}: KPICardProps) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-rose-50 text-rose-600 border-rose-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100'
  };
  return (
    <motion.div
      whileHover={{
        y: -4,
        boxShadow:
        '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)'
      }}
      className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all">
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-lg border ${colorStyles[color]}`}>
          <Icon size={24} strokeWidth={2} />
        </div>
      </div>

      {(subtitle || trendValue) &&
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          {trend && trendValue &&
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-100 text-emerald-700' : trend === 'down' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
          
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </span>
        }
          {subtitle &&
        <span className="text-xs text-slate-500">{subtitle}</span>
        }
        </div>
      }
    </motion.div>);

}
