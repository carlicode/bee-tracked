import { useCallback, useMemo, useRef, useState } from 'react';
import type { DiaHorario } from '../services/calendariosApi';
import {
  GRID_HORA_FIN,
  GRID_HORA_INICIO,
  SLOT_MINUTES,
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

function formatHoras(slotCount: number): string {
  const mins = slotCount * SLOT_MINUTES;
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  if (mm === 0) return `${hh}h`;
  return `${hh}h ${mm}m`;
}

export function HorarioGrid({ fechaDesde, fechaHasta, dias, onChange, readOnly }: HorarioGridProps) {
  const dragRef = useRef<{ active: boolean; select: boolean }>({ active: false, select: true });
  const [weekIndex, setWeekIndex] = useState(0);
  const [copyTargetIdx, setCopyTargetIdx] = useState<number | ''>('');

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

  const dayStats = useMemo(() => {
    return weekFechas.map((fecha) => {
      const selected = blocksByFecha[fecha] || new Set<number>();
      const dia = normalizeDiaHorario(dias[fecha] || { fecha, trabaja: false, turnos: [] });
      return {
        fecha,
        slotCount: selected.size,
        horas: formatHoras(selected.size),
        turnosTexto: dia.turnos.map((t) => `${t.inicio}-${t.fin}`).join(', '),
      };
    });
  }, [blocksByFecha, dias, weekFechas]);

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
    if (!w?.length) return `Semana ${idx + 1}`;
    return `Semana ${idx + 1} (${w[0].slice(5)}-${w[w.length - 1].slice(5)})`;
  };

  const remainingWeekOptions = weeks
    .map((_, idx) => idx)
    .filter((idx) => idx > weekIndex)
    .map((idx) => ({ value: idx, label: weekLabel(idx) }));

  return (
    <div className="space-y-4" onMouseUp={stopDrag} onMouseLeave={stopDrag}>
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-white to-gray-50 p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Editor visual</span>
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Bloques de 30 min
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {readOnly ? 'Modo lectura' : 'Arrastra para pintar/borrar'}
          </span>
        </div>

        {weeks.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={weekIndex === 0}
              onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
              className="h-8 w-8 rounded-lg border bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              ‹
            </button>
            <div className="flex flex-wrap gap-1">
              {weeks.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setWeekIndex(idx)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    idx === weekIndex
                      ? 'bg-beeadmin-purple text-white shadow-sm'
                      : 'border bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {weekLabel(idx)}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={weekIndex >= weeks.length - 1}
              onClick={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))}
              className="h-8 w-8 rounded-lg border bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        )}

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={aplicarLunVie}
              className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Lun-Vie 06:00-14:00
            </button>
            <button
              type="button"
              onClick={limpiarSemana}
              className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Limpiar semana
            </button>

            {remainingWeekOptions.length > 0 && (
              <>
                <select
                  className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-700"
                  value={copyTargetIdx}
                  onChange={(e) => setCopyTargetIdx(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Elegir semana destino</option>
                  {remainingWeekOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={copyTargetIdx === ''}
                  onClick={() => copyTargetIdx !== '' && copiarSemanaA(copyTargetIdx)}
                  className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Copiar a semana
                </button>
                <button
                  type="button"
                  onClick={copiarATodasRestantes}
                  className="rounded-lg border border-beeadmin-purple bg-white px-3 py-1.5 text-sm font-medium text-beeadmin-purple hover:bg-purple-50"
                >
                  Copiar a todas las restantes
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm select-none">
        <table className="min-w-full border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-gray-50">
            <tr>
              <th className="sticky left-0 z-30 w-16 border border-gray-200 bg-gray-50 p-1" />
              {weekFechas.map((fecha) => (
                <th key={fecha} className="min-w-[90px] border border-gray-200 bg-gray-50 px-2 py-1 text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-700">{diaSemanaLabel(fecha)}</div>
                  <div className="font-mono text-[11px] text-gray-500">{fecha.slice(5)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, slotIdx) => {
              const showLabel = slot.endsWith(':00');
              return (
                <tr key={slot}>
                  <td
                    className={`sticky left-0 z-10 w-16 border border-gray-200 bg-white pr-2 text-right font-mono text-[10px] ${
                      showLabel ? 'text-gray-500' : 'text-gray-300'
                    }`}
                  >
                    {showLabel ? slot : '·'}
                  </td>
                  {weekFechas.map((fecha) => {
                    const selected = blocksByFecha[fecha]?.has(slotIdx) ?? false;
                    const borderClass = slot.endsWith(':00') ? 'border-t-gray-300' : 'border-t-gray-200';
                    return (
                      <td
                        key={`${fecha}-${slotIdx}`}
                        className={`h-4 border border-gray-200 ${borderClass} transition-colors ${
                          readOnly ? 'cursor-default' : 'cursor-pointer'
                        } ${selected ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-white hover:bg-emerald-50'}`}
                        onMouseDown={() => onSlotMouseDown(fecha, slotIdx)}
                        onMouseEnter={() => onSlotMouseEnter(fecha, slotIdx)}
                        title={`${fecha} ${slot}`}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {dayStats.map((d) => (
          <div key={d.fecha} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs">
            <div className="font-semibold capitalize text-gray-800">
              {diaSemanaLabel(d.fecha)} <span className="font-mono text-gray-500">{d.fecha.slice(5)}</span>
            </div>
            <div className="mt-1 text-gray-600">
              {d.slotCount > 0 ? `${d.horas} programadas` : 'Sin bloques seleccionados'}
            </div>
            {d.turnosTexto && <div className="mt-1 text-gray-500">{d.turnosTexto}</div>}
          </div>
        ))}
      </div>

      {!readOnly && (
        <p className="text-xs text-gray-500">
          Tip: puedes marcar bloques discontinuos en un mismo dia para crear turnos partidos (ej. 06:00-08:00 y 14:00-16:00).
        </p>
      )}
    </div>
  );
}
