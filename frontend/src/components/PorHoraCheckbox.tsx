export interface PorHoraCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Clases para checkbox (ej. text-beezero-yellow focus:ring-beezero-yellow o text-ecodelivery-green focus:ring-ecodelivery-green) */
  checkboxClass?: string;
  disabled?: boolean;
}

/**
 * Checkbox reutilizable para indicar "Carrera por hora".
 * Cuando está activo, los campos Lugar recojo, Lugar destino y Distancia se deshabilitan.
 */
export function PorHoraCheckbox({
  checked,
  onChange,
  checkboxClass = 'text-ecodelivery-green focus:ring-ecodelivery-green',
  disabled,
}: PorHoraCheckboxProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        id="porHora"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className={`w-5 h-5 rounded border-2 border-gray-300 focus:ring-2 focus:ring-offset-0 ${checkboxClass}`}
        aria-describedby="porHora-desc"
      />
      <label htmlFor="porHora" id="porHora-desc" className="text-sm font-medium text-black">
        Carrera por hora
      </label>
    </div>
  );
}
