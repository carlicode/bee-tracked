import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extraordinariosApi, type Extraordinario, type Turno } from '../../services/extraordinariosApi';
import { useToast } from '../../contexts/ToastContext';
import { HorarioGrid } from '../../components/HorarioGrid';
import { normalizeDiaHorario, type DiaHorario } from '../../services/calendariosApi';

type ExtraordinariosWorkerProps = {
  variant: 'beezero' | 'ecodelivery' | 'operador';
  dashboardPath: string;
};

function initDias(extra: Extraordinario): Record<string, DiaHorario> {
  const turnos: Turno[] =
    extra.horaInicioSugerida && extra.horaFinSugerida
      ? [{ inicio: extra.horaInicioSugerida, fin: extra.horaFinSugerida }]
      : [];
  return {
    [extra.fecha]: normalizeDiaHorario({ fecha: extra.fecha, trabaja: turnos.length > 0, turnos }),
  };
}

export function ExtraordinariosWorker({ variant, dashboardPath }: ExtraordinariosWorkerProps) {
  const toast = useToast();
  const [list, setList] = useState<Extraordinario[]>([]);
  const [loading, setLoading] = useState(true);
  const [inscribiendo, setInscribiendo] = useState<string | null>(null);
  const [formExtra, setFormExtra] = useState<Extraordinario | null>(null);
  const [dias, setDias] = useState<Record<string, DiaHorario>>({});

  const linkClass =
    variant === 'beezero'
      ? 'text-beezero-yellow-dark'
      : variant === 'operador'
        ? 'text-blue-700'
        : 'text-ecodelivery-green';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await extraordinariosApi.getAbiertos());
    } catch (err) {
      toast.show(extraordinariosApi.parseError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const abrirFormulario = (extra: Extraordinario) => {
    setFormExtra(extra);
    setDias(initDias(extra));
  };

  const confirmarInscripcion = async () => {
    if (!formExtra) return;
    const diaSeleccionado = dias[formExtra.fecha];
    const turnos: Turno[] = diaSeleccionado?.turnos ?? [];
    if (turnos.length === 0) {
      toast.show('Seleccioná al menos un bloque horario.', 'error');
      return;
    }
    setInscribiendo(formExtra.extraId);
    try {
      await extraordinariosApi.inscribirse(formExtra.extraId, turnos);
      toast.show('Inscripción enviada. RRHH debe aprobarla.', 'success');
      setFormExtra(null);
      void load();
    } catch (err) {
      toast.show(extraordinariosApi.parseError(err), 'error');
    } finally {
      setInscribiendo(null);
    }
  };

  return (
    <div className="space-y-6">
      <Link to={dashboardPath} className={`text-sm font-medium ${linkClass}`}>
        ← Volver al panel
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Días extraordinarios</h1>
        <p className="text-gray-600 text-sm mt-1">Inscríbete antes de trabajar un día especial.</p>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500">No hay días extraordinarios abiertos.</p>
      ) : (
        list.map((e) => {
          const isOpen = formExtra?.extraId === e.extraId;
          return (
            <div key={e.extraId} className="rounded-xl border p-4 space-y-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-semibold">{e.titulo}</p>
                  <p className="text-sm text-gray-600">{e.fecha}</p>
                  {e.descripcion && <p className="text-sm mt-1">{e.descripcion}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Horario sugerido: {e.horaInicioSugerida}–{e.horaFinSugerida}
                  </p>
                </div>
                {!isOpen && (
                  <button
                    type="button"
                    onClick={() => abrirFormulario(e)}
                    className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm self-start"
                  >
                    Inscribirme
                  </button>
                )}
              </div>

              {isOpen && formExtra && (
                <div className="border-t pt-4 space-y-4">
                  <p className="text-sm font-medium text-gray-700">
                    Marcá los bloques en los que querés trabajar este día:
                  </p>
                  <HorarioGrid
                    fechaDesde={formExtra.fecha}
                    fechaHasta={formExtra.fecha}
                    dias={dias}
                    onChange={setDias}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={inscribiendo === formExtra.extraId}
                      onClick={() => void confirmarInscripcion()}
                      className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-50"
                    >
                      {inscribiendo === formExtra.extraId ? 'Enviando…' : 'Confirmar inscripción'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormExtra(null)}
                      className="px-4 py-2 rounded-lg border text-sm text-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
