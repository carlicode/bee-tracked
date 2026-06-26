import { useCallback, useRef } from 'react';
import type { DiaHorario } from '../services/calendariosApi';
import { diaSemanaLabel, fechasEnRango } from '../services/calendariosApi';

type HorarioGridProps = {
  fechaDesde: string;
  fechaHasta: string;
  dias: Record<string, DiaHorario>;
  onChange: (dias: Record<string, DiaHorario>) => void;
  readOnly?: boolean;
};

export function HorarioGrid({ fechaDesde, fechaHasta, dias, onChange, readOnly }: HorarioGridProps) {
  const dragRef = useRef<{ active: boolean; trabaja: boolean }>({ active: false, trabaja: true });
  const fechas = fechasEnRango(fechaDesde, fechaHasta);

  const setDia = useCallback(
    (fecha: string, patch: Partial<DiaHorario>) => {
      if (readOnly) return;
      onChange({
        ...dias,
        [fecha]: { ...dias[fecha], fecha, ...patch },
      });
    },
    [dias, onChange, readOnly]
  );

  const aplicarLunVie = () => {
    if (readOnly) return;
    const next = { ...dias };
    for (const fecha of fechas) {
      const dow = new Date(`${fecha}T12:00:00`).getUTCDay();
      const esLaboral = dow >= 1 && dow <= 5;
      next[fecha] = {
        fecha,
        trabaja: esLaboral,
        horaInicio: '06:00',
        horaFin: '14:00',
      };
    }
    onChange(next);
  };

  const toggleAllTrabaja = (trabaja: boolean) => {
    if (readOnly) return;
    const next = { ...dias };
    for (const fecha of fechas) {
      next[fecha] = { ...next[fecha], fecha, trabaja, horaInicio: '06:00', horaFin: '14:00' };
    }
    onChange(next);
  };

  const onCellMouseDown = (fecha: string) => {
    if (readOnly) return;
    const current = dias[fecha]?.trabaja ?? false;
    dragRef.current = { active: true, trabaja: !current };
    setDia(fecha, { trabaja: !current, horaInicio: '06:00', horaFin: '14:00' });
  };

  const onCellMouseEnter = (fecha: string) => {
    if (readOnly || !dragRef.current.active) return;
    setDia(fecha, { trabaja: dragRef.current.trabaja, horaInicio: '06:00', horaFin: '14:00' });
  };

  const stopDrag = () => {
    dragRef.current.active = false;
  };

  return (
    <div className="space-y-3" onMouseUp={stopDrag} onMouseLeave={stopDrag}>
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={aplicarLunVie} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">
            Lun–Vie 06:00–14:00
          </button>
          <button type="button" onClick={() => toggleAllTrabaja(true)} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">
            Todos trabajan
          </button>
          <button type="button" onClick={() => toggleAllTrabaja(false)} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">
            Todos libres
          </button>
          <span className="text-xs text-gray-500 self-center">Arrastra sobre las filas para marcar/desmarcar días</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 border text-left">Fecha</th>
              <th className="p-2 border text-left">Día</th>
              <th className="p-2 border text-center">Trabaja</th>
              <th className="p-2 border">Entrada</th>
              <th className="p-2 border">Salida</th>
            </tr>
          </thead>
          <tbody>
            {fechas.map((fecha) => {
              const d = dias[fecha] || { fecha, trabaja: false, horaInicio: '06:00', horaFin: '14:00' };
              return (
                <tr
                  key={fecha}
                  className={d.trabaja ? 'bg-green-50' : 'bg-white'}
                  onMouseDown={() => onCellMouseDown(fecha)}
                  onMouseEnter={() => onCellMouseEnter(fecha)}
                >
                  <td className="p-2 border font-mono text-xs">{fecha}</td>
                  <td className="p-2 border capitalize">{diaSemanaLabel(fecha)}</td>
                  <td className="p-2 border text-center">
                    <input
                      type="checkbox"
                      checked={d.trabaja}
                      disabled={readOnly}
                      onChange={(e) => setDia(fecha, { trabaja: e.target.checked })}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="time"
                      className="border rounded px-2 py-1 w-full"
                      value={d.horaInicio}
                      disabled={readOnly || !d.trabaja}
                      onChange={(e) => setDia(fecha, { horaInicio: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="time"
                      className="border rounded px-2 py-1 w-full"
                      value={d.horaFin}
                      disabled={readOnly || !d.trabaja}
                      onChange={(e) => setDia(fecha, { horaFin: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
