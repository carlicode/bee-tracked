import { useState, useRef, useEffect } from 'react';

const MANUAL_ENTRY_OPTION = 'Ingresar manualmente';

export interface ClienteSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | string[];
  placeholder?: string;
  required?: boolean;
  /** Clases para focus (ej. focus:ring-beezero-yellow o focus:ring-ecodelivery-green) */
  focusRingClass?: string;
  /** Clase para item seleccionado (ej. bg-beezero-yellow/20 o bg-ecodelivery-green/20) */
  selectedClass?: string;
  id?: string;
}

/**
 * Select/combobox de cliente con estilos consistentes.
 * Permite elegir de la lista o escribir un valor manual.
 */
export function ClienteSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecciona o escribe el nombre del cliente',
  required,
  focusRingClass = 'focus:ring-beezero-yellow focus:border-beezero-yellow',
  selectedClass = 'bg-gray-100',
  id = 'cliente',
}: ClienteSelectProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const opts = [...options].sort((a, b) => a.localeCompare(b, 'es'));
  const filtered = filter.trim()
    ? opts.filter((o) => o.toLowerCase().includes(filter.toLowerCase().trim()))
    : opts;

  useEffect(() => {
    setFilter(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    if (opt === MANUAL_ENTRY_OPTION) {
      onChange('');
      setFilter('');
      setOpen(false);
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    onChange(opt);
    setFilter(opt);
    setOpen(false);
  };

  const handleInputChange = (v: string) => {
    setFilter(v);
    onChange(v);
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        id={id}
        required={required}
        value={filter}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${focusRingClass} bg-white`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen((o) => !o)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
        aria-label="Abrir lista"
      >
        <svg className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul
          className="absolute z-50 w-full mt-1 max-h-48 overflow-auto rounded-lg border-2 border-gray-200 bg-white shadow-lg py-1"
          role="listbox"
        >
          <li
            role="option"
            onClick={() => handleSelect(MANUAL_ENTRY_OPTION)}
            className="px-3 py-2 cursor-pointer text-gray-600 hover:bg-gray-100 active:bg-gray-100 border-b border-gray-100 font-medium"
          >
            {MANUAL_ENTRY_OPTION}
          </li>
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-gray-500 text-sm">Sin coincidencias</li>
          ) : (
            filtered.map((opt) => (
              <li
                key={opt}
                role="option"
                aria-selected={value === opt}
                onClick={() => handleSelect(opt)}
                className={`px-3 py-2 cursor-pointer text-gray-900 hover:bg-gray-100 active:bg-gray-100 ${value === opt ? `${selectedClass} font-medium` : ''}`}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
