import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'emerald' | 'amber' | 'critical';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'emerald':
        return {
          border: 'border-emerald-200',
          bg: 'bg-white',
          iconBg: 'bg-emerald-50 text-emerald-600',
          textColor: 'text-emerald-700',
        };
      case 'amber':
        return {
          border: 'border-amber-200',
          bg: 'bg-white',
          iconBg: 'bg-amber-50 text-amber-600',
          textColor: 'text-amber-800',
        };
      case 'critical':
        return {
          border: 'border-red-200',
          bg: 'bg-white',
          iconBg: 'bg-red-50 text-red-600',
          textColor: 'text-red-700',
        };
      default:
        return {
          border: 'border-[#E5EAF0]',
          bg: 'bg-white',
          iconBg: 'bg-slate-50 text-slate-600',
          textColor: 'text-[#172033]',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`p-5 rounded-xl border ${styles.border} ${styles.bg} shadow-sm hover:shadow transition-shadow`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg ${styles.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${styles.textColor}`}>{value}</div>
      {(subtitle || trend) && (
        <div className="mt-1 flex items-center justify-between text-xs text-[#64748B]">
          <span>{subtitle}</span>
          {trend && <span className="font-medium text-emerald-600">{trend}</span>}
        </div>
      )}
    </div>
  );
};

