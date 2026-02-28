import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export type DashboardCardTheme = 'beezero' | 'ecodelivery';

const themeClasses: Record<
  DashboardCardTheme,
  { border: string; iconBg: string; iconColor: string }
> = {
  beezero: {
    border: 'border-beezero-yellow hover:shadow-xl',
    iconBg: 'bg-beezero-yellow',
    iconColor: 'text-black',
  },
  ecodelivery: {
    border: 'border-ecodelivery-green hover:shadow-xl',
    iconBg: 'bg-ecodelivery-green',
    iconColor: 'text-white',
  },
};

export interface DashboardCardProps {
  to: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  description: string;
  theme: DashboardCardTheme;
  children?: ReactNode;
}

/**
 * Tarjeta de acción del dashboard. Layout vertical (móvil-first):
 * icono arriba, título, subtítulo y descripción. Una tarjeta por fila en grid.
 */
export function DashboardCard({
  to,
  icon,
  title,
  subtitle,
  description,
  theme,
  children,
}: DashboardCardProps) {
  const { border, iconBg, iconColor } = themeClasses[theme];

  return (
    <Link
      to={to}
      className={`
        block w-full bg-white rounded-xl shadow-lg p-6
        border-2 ${border}
        transition transform active:scale-[0.98]
        min-h-[44px] touch-manipulation
      `}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div
            className={`flex-shrink-0 w-14 h-14 sm:w-12 sm:h-12 rounded-full ${iconBg} flex items-center justify-center ${iconColor}`}
            aria-hidden
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-black">{title}</h3>
            <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <p className="text-gray-700 text-sm">{description}</p>
        {children}
      </div>
    </Link>
  );
}
