import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  calendariosApi,
  DIAS_SEMANA,
  type CalendarioSemana,
  type DiaCalendario,
} from '../../services/calendariosApi';
import { useToast } from '../../contexts/ToastContext';

type MiCalendarioProps = {
  variant: 'beezero' | 'ecodelivery' | 'operador';
  dashboardPath: string;
};

export function MiCalendario({ variant, dashboardPath }: MiCalendarioProps) {
  const toast = useToast();
  const [semana, setSemana] = useState('');
  const [calendario, setCalendario] = useState<CalendarioSemana | null>(null);
  const [propuestaDias, setPropuestaDias] = useState<Record<string, DiaCalendario> | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const linkClass =
    variant === 'beezero'
      ? 'text-beezero-yellow-dark'
      : variant === 'operador'
        ? 'text-blue-700'
        : 'text-ecodelivery-green';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meta = await calendariosApi.getSemanaActual();
      setSemana(meta.semana);
      const cal = (await calendariosApi.getMiCalendario(meta.semana)) as CalendarioSemana | null;
      setCalendario(cal || null);
    } catch (err) {
      toast.show(calendariosApi.parseError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const iniciarPropuesta = () => {
    if (!calendario) {
      calendariosApi.getSemanaActual().then((m) => {
        const dias: Record<string, DiaCalendario> = {};
        DIAS_SEMANA.forEach((d) => {
          dias[d] = { fecha: '', trabaja: false, horaInicio: '08:00', horaFin: '17:00' };
        });
        setPropuestaDias(dias);
        setSemana(m.semana);
      });
      return;
    }
    setPropuestaDias(JSON.parse(JSON.stringify(calendario.dias)) as Record<string, DiaCalendario>);
  };

  const enviarPropuesta = async () => {
    if (!propuestaDias || !semana) return;
    setEnviando(true);
    try {
      const meta = await calendariosApi.getSemanaActual();
      await calendariosApi.enviarPropuesta({
        semana,
        fechaInicioSemana: meta.fechaInicioSemana,
        dias: propuestaDias,
      });
      toast.show('Propuesta enviada a RRHH', 'success');
      setPropuestaDias(null);
    } catch (err) {
      toast.show(calendariosApi.parseError(err), 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to={dashboardPath} className={`text-sm font-medium ${linkClass}`}>
        ← Volver al panel
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi calendario</h1>
        <p className="text-gray-600 text-sm mt-1">Semana {semana || '—'}</p>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : !calendario ? (
        <div className="rounded-xl border p-4 text-gray-600">
          <p>Aún no tienes calendario publicado para esta semana.</p>
          <button type="button" onClick={iniciarPropuesta} className="mt-3 px-4 py-2 rounded-lg border text-sm">
            Proponer mi horario
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {DIAS_SEMANA.map((d) => {
              const dia = calendario.dias[d];
              if (!dia) return null;
              return (
                <div key={d} className={`rounded-lg border p-3 text-sm ${dia.trabaja ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                  <p className="font-semibold capitalize">{d}</p>
                  <p className="text-xs text-gray-500">{dia.fecha}</p>
                  {dia.trabaja ? (
                    <p className="mt-1">{dia.horaInicio} – {dia.horaFin}</p>
                  ) : (
                    <p className="mt-1 text-gray-500">Libre</p>
                  )}
                </div>
              );
            })}
          </div>
          <button type="button" onClick={iniciarPropuesta} className="px-4 py-2 rounded-lg border text-sm">
            Proponer cambios
          </button>
        </>
      )}

      {propuestaDias && (
        <div className="rounded-xl border p-4 space-y-3 bg-gray-50">
          <h2 className="font-semibold">Propuesta de horario</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border bg-white">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2 border">Día</th>
                  <th className="p-2 border">Trabaja</th>
                  <th className="p-2 border">Inicio</th>
                  <th className="p-2 border">Fin</th>
                </tr>
              </thead>
              <tbody>
                {DIAS_SEMANA.map((d) => (
                  <tr key={d}>
                    <td className="p-2 border capitalize">{d}</td>
                    <td className="p-2 border text-center">
                      <input
                        type="checkbox"
                        checked={propuestaDias[d]?.trabaja}
                        onChange={(e) =>
                          setPropuestaDias({
                            ...propuestaDias,
                            [d]: { ...propuestaDias[d], trabaja: e.target.checked },
                          })
                        }
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        type="time"
                        className="border rounded px-2 py-1"
                        value={propuestaDias[d]?.horaInicio || ''}
                        onChange={(e) =>
                          setPropuestaDias({
                            ...propuestaDias,
                            [d]: { ...propuestaDias[d], horaInicio: e.target.value },
                          })
                        }
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        type="time"
                        className="border rounded px-2 py-1"
                        value={propuestaDias[d]?.horaFin || ''}
                        onChange={(e) =>
                          setPropuestaDias({
                            ...propuestaDias,
                            [d]: { ...propuestaDias[d], horaFin: e.target.value },
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={enviando} onClick={() => void enviarPropuesta()} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-50">
              Enviar propuesta
            </button>
            <button type="button" onClick={() => setPropuestaDias(null)} className="px-4 py-2 rounded-lg border text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
