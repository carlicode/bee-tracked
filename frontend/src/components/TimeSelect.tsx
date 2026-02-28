import { formatters } from '../utils/formatters';

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

function parseHora(hora: string | undefined): [string, string] {
  if (!hora || !/^\d{2}:\d{2}$/.test(formatters.normalizeHoraHHmm(hora) || hora)) return ['', ''];
  const normalized = formatters.normalizeHoraHHmm(hora) || hora;
  const [h, m] = normalized.split(':');
  return [h || '', m || ''];
}

export interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  /** Clase para el contenedor (ej. para focus ring: focus:ring-ecodelivery-green o focus:ring-beezero-yellow) */
  focusRingClass?: string;
  disabled?: boolean;
}

/**
 * Selectores de hora y minutos (HH:mm), sin segundos. Mismo formato en toda la app.
 */
export function TimeSelect({
  value,
  onChange,
  label,
  required,
  focusRingClass = 'focus:ring-ecodelivery-green focus:border-ecodelivery-green',
  disabled,
}: TimeSelectProps) {
  const [h, m] = parseHora(value);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-black mb-1">
          {label} {required && '*'}
        </label>
      )}
      <div className="flex gap-2 items-center">
        <select
          value={h}
          onChange={(e) => {
            const newH = e.target.value;
            // Si hay hora, usamos '00' como minutos por defecto si no hay minutos aún
            if (newH) {
              onChange(`${newH}:${m || '00'}`);
            } else {
              onChange('');
            }
          }}
          onClick={(e) => {
            e.currentTarget.focus();
          }}
          required={required}
          disabled={disabled}
          className={`flex-1 min-h-[48px] text-base border-2 border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 ${focusRingClass} bg-white`}
          style={{ fontSize: '16px' }}
        >
          <option value="">Hora</option>
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>
        <span className="text-xl font-bold text-gray-600">:</span>
        <select
          value={m}
          onChange={(e) => {
            const newM = e.target.value;
            // Si hay minutos, usamos '00' como hora por defecto si no hay hora aún
            if (newM) {
              onChange(`${h || '00'}:${newM}`);
            } else {
              onChange('');
            }
          }}
          onClick={(e) => {
            e.currentTarget.focus();
          }}
          required={required}
          disabled={disabled}
          className={`flex-1 min-h-[48px] text-base border-2 border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 ${focusRingClass} bg-white`}
          style={{ fontSize: '16px' }}
        >
          <option value="">Min</option>
          {MINUTES.map((min) => (
            <option key={min} value={min}>
              {min}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
