import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extraordinariosApi, type Extraordinario } from '../../services/extraordinariosApi';
import { useToast } from '../../contexts/ToastContext';

type ExtraordinariosWorkerProps = {
  variant: 'beezero' | 'ecodelivery' | 'operador';
  dashboardPath: string;
};

type HorarioForm = { extraId: string; horaInicio: string; horaFin: string };

export function ExtraordinariosWorker({ variant, dashboardPath }: ExtraordinariosWorkerProps) {
  const toast = useToast();
  const [list, setList] = useState<Extraordinario[]>([]);
  const [loading, setLoading] = useState(true);
  const [inscribiendo, setInscribiendo] = useState<string | null>(null);
  const [horarioForm, setHorarioForm] = useState<HorarioForm | null>(null);

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
    setHorarioForm({
      extraId: extra.extraId,
      horaInicio: extra.horaInicioSugerida || '',
      horaFin: extra.horaFinSugerida || '',
    });
  };

  const confirmarInscripcion = async () => {
    if (!horarioForm) return;
    setInscribiendo(horarioForm.extraId);
    try {
      await extraordinariosApi.inscribirse(horarioForm.extraId, horarioForm.horaInicio, horarioForm.horaFin);
      toast.show('Inscripción enviada. RRHH debe aprobarla.', 'success');
      setHorarioForm(null);
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
          const isOpen = horarioForm?.extraId === e.extraId;
          return (
            <div key={e.extraId} className="rounded-xl border p-4 space-y-3">
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

              {isOpen && horarioForm && (
                <div className="border-t pt-3 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Confirmá tu horario para este día:</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-gray-600">Entrada</span>
                      <input
                        type="time"
                        value={horarioForm.horaInicio}
                        onChange={(ev) => setHorarioForm({ ...horarioForm, horaInicio: ev.target.value })}
                        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-gray-600">Salida</span>
                      <input
                        type="time"
                        value={horarioForm.horaFin}
                        onChange={(ev) => setHorarioForm({ ...horarioForm, horaFin: ev.target.value })}
                        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={inscribiendo === e.extraId || !horarioForm.horaInicio || !horarioForm.horaFin}
                      onClick={() => void confirmarInscripcion()}
                      className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-50"
                    >
                      {inscribiendo === e.extraId ? 'Enviando…' : 'Confirmar inscripción'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHorarioForm(null)}
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
