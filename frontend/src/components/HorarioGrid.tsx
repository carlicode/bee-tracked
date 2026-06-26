import { useCallback, useMemo, useRef, useState } from 'react';
import type { DiaHorario } from '../services/calendariosApi';
import {
  GRID_HORA_FIN,
  GRID_HORA_INICIO,
  blocksToTurnos,
  diaSemanaLabel,
  fechasEnRango,
  groupIntoWeeks,
  normalizeDiaHorario,
  slotsInRange,
  turnosToBlocks,
} from '../services/calendariosApi';

type HorarioGridProps = {
  fechaDesde: string;
  fechaHasta: string;
  dias: Record<string, DiaHorario>;
  onChange: (dias: Record<string, DiaHorario>) => void;
  readOnly?: boolean;
};

function diaFromBlocks(fecha: string, blocks: Set<number>): DiaHorario {
  const turnos = blocksToTurnos(blocks);
  return normalizeDiaHorario({ fecha, trabaja: turnos.length > 0, turnos });
}

export function HorarioGrid({ fechaDesde, fechaHasta, dias, onChange, readOnly }: HorarioGridProps) {
  const dragRef = useRef<{ active: boolean; select: boolean }>({ active: false, select: true });
  const [weekIndex, setWeekIndex] = useState(0);

  const allFechas = fechasEnRango(fechaDesde, fechaHasta);
  const weeks = useMemo(() => groupIntoWeeks(allFechas), [allFechas]);
  const weekFechas = weeks[weekIndex] || weeks[0] || [];
  const timeSlots = useMemo(() => slotsInRange(GRID_HORA_INICIO, GRID_HORA_FIN), []);

  const blocksByFecha = useMemo(() => {
    const out: Record<string, Set<number>> = {};
    for (const fecha of allFechas) {
      const d = normalizeDiaHorario(dias[fecha] || { fecha, trabaja: false, turnos: [] });
      out[fecha] = turnosToBlocks(d.turnos);
    }
    return out;
  }, [allFechas, dias]);

  const updateFechaBlocks = useCallback(
    (fecha: string, blocks: Set<number>) => {
      if (readOnly) return;
      onChange({
        ...dias,
        [fecha]: diaFromBlocks(fecha, blocks),
      });
    },
    [dias, onChange, readOnly]
  );

  const setSlot = useCallback(
    (fecha: string, slotIdx: number, selected: boolean) => {
      if (readOnly) return;
      const next = new Set(blocksByFecha[fecha] || []);
      if (selected) next.add(slotIdx);
      else next.delete(slotIdx);
      updateFechaBlocks(fecha, next);
    },
    [blocksByFecha, readOnly, updateFechaBlocks]
  );

  const onSlotMouseDown = (fecha: string, slotIdx: number) => {
    if (readOnly) return;
    const current = blocksByFecha[fecha]?.has(slotIdx) ?? false;
    dragRef.current = { active: true, select: !current };
    setSlot(fecha, slotIdx, !current);
  };

  const onSlotMouseEnter = (fecha: string, slotIdx: number) => {
    if (readOnly || !dragRef.current.active) return;
    setSlot(fecha, slotIdx, dragRef.current.select);
  };

  const stopDrag = () => {
    dragRef.current.active = false;
  };

  const limpiarSemana = () => {
    if (readOnly) return;
    const next = { ...dias };
    for (const fecha of weekFechas) {
      next[fecha] = diaFromBlocks(fecha, new Set());
    }
    onChange(next);
  };

  const aplicarLunVie = () => {
    if (readOnly) return;
    const next = { ...dias };
    for (const fecha of weekFechas) {
      const dow = new Date(`${fecha}T12:00:00`).getUTCDay();
      const esLaboral = dow >= 1 && dow <= 5;
      const blocks = esLaboral ? turnosToBlocks([{ inicio: '06:00', fin: '14:00' }]) : new Set<number>();
      next[fecha] = diaFromBlocks(fecha, blocks);
    }
    onChange(next);
  };

  const copiarSemanaA = (targetWeekIdx: number) => {
    if (readOnly || targetWeekIdx === weekIndex) return;
    const source = weekFechas;
    const target = weeks[targetWeekIdx] || [];
    const next = { ...dias };
    for (let i = 0; i < source.length; i++) {
      const srcFecha = source[i];
      const tgtFecha = target[i];
      if (!tgtFecha) continue;
      const srcDia = normalizeDiaHorario(dias[srcFecha] || { fecha: srcFecha, trabaja: false, turnos: [] });
      next[tgtFecha] = normalizeDiaHorario({
        fecha: tgtFecha,
        trabaja: srcDia.trabaja,
        turnos: srcDia.turnos.map((t) => ({ ...t })),
      });
    }
    onChange(next);
  };

  const copiarATodasRestantes = () => {
    if (readOnly) return;
    const next = { ...dias };
    const source = weekFechas;
    for (let w = weekIndex + 1; w < weeks.length; w++) {
      const target = weeks[w] || [];
      for (let i = 0; i < source.length; i++) {
        const srcFecha = source[i];
        const tgtFecha = target[i];
        if (!tgtFecha) continue;
        const srcDia = normalizeDiaHorario(next[srcFecha] || { fecha: srcFecha, trabaja: false, turnos: [] });
        next[tgtFecha] = normalizeDiaHorario({
          fecha: tgtFecha,
          trabaja: srcDia.trabaja,
          turnos: srcDia.turnos.map((t) => ({ ...t })),
        });
      }
    }
    onChange(next);
  };

  const weekLabel = (idx: number) => {
    const w = weeks[idx];
    if (!w?.length) return `Sem ${idx + 1}`;
    return `Sem ${idx + 1} (${w[0].slice(5)}–${w[w.length - 1].slice(5)})`;
  };

  return (
    <div className="space-y-3" onMouseUp={stopDrag} onMouseLeave={stopDrag}>
      {weeks.length > 1 && (
        <div className="flex flex-wrap gap-1 items-center">
          <button
            type="button"
            disabled={weekIndex === 0}
            onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
            className="px-2 py-1 rounded border text-sm disabled:opacity-40"
          >
            ‹
          </button>
          {weeks.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setWeekIndex(idx)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                idx === weekIndex ? 'bg-beeadmin-purple text-white' : 'bg-white border text-gray-700'
              }`}
            >
              {weekLabel(idx)}
            </button>
          ))}
          <button
            type="button"
            disabled={weekIndex >= weeks.length - 1}
            onClick={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))}
            className="px-2 py-1 rounded border text-sm disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" onClick={aplicarLunVie} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">
            Lun–Vie 06:00–14:00
          </button>
          <button type="button" onClick={limpiarSemana} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">
            Limpiar semana
          </button>
          {weeks.length > 1 && weekIndex < weeks.length - 1 && (
            <>
              {weeks.slice(weekIndex + 1).map((_, offset) => {
                const targetIdx = weekIndex + 1 + offset;
                return (
                  <button
                    key={targetIdx}
                    type="button"
                    onClick={() => copiarSemanaA(targetIdx)}
                    className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
                  >
                    Copiar → {weekLabel(targetIdx)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={copiarATodasRestantes}
                className="px-3 py-1.5 rounded-lg border border-beeadmin-purple text-beeadmin-purple text-sm hover:bg-purple-50"
              >
                Copiar a todas las restantes
              </button>
            </>
          )}
          <span className="text-xs text-gray-500">Arrastra para marcar bloques de 30 min</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border select-none">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-1 border w-12 sticky left-0 bg-gray-50 z-10" />
              {weekFechas.map((fecha) => (
                <th key={fecha} className="p-1 border text-center min-w-[72px]">
                  <div className="font-medium capitalize">{diaSemanaLabel(fecha)}</div>
                  <div className="text-gray-400 font-mono">{fecha.slice(5)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, slotIdx) => {
              const showLabel = slot.endsWith(':00');
              return (
                <tr key={slot}>
                  <td className="p-0 border text-right pr-1 text-gray-400 sticky left-0 bg-white z-10 w-12">
                    {showLabel ? slot : ''}
                  </td>
                  {weekFechas.map((fecha) => {
                    const selected = blocksByFecha[fecha]?.has(slotIdx) ?? false;
                    return (
                      <td
                        key={`${fecha}-${slotIdx}`}
                        className={`p-0 border h-3 cursor-${readOnly ? 'default' : 'pointer'} ${
                          selected ? 'bg-green-400 hover:bg-green-500' : 'bg-white hover:bg-green-50'
                        }`}
                        onMouseDown={() => onSlotMouseDown(fecha, slotIdx)}
                        onMouseEnter={() => onSlotMouseEnter(fecha, slotIdx)}
                        title={selected ? `${slot} — ${fecha}` : undefined}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && weekFechas.length > 0 && (
        <div className="text-xs text-gray-500 space-y-1">
          {weekFechas.map((fecha) => {
            const d = normalizeDiaHorario(dias[fecha] || { fecha, trabaja: false, turnos: [] });
            if (!d.trabaja) return null;
            return (
              <div key={fecha}>
                <span className="font-medium capitalize">{diaSemanaLabel(fecha)} {fecha.slice(5)}:</span>{' '}
                {d.turnos.map((t) => `${t.inicio}–${t.fin}`).join(', ')}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
