import { useCallback, useEffect, useState } from 'react';
import {
  calendariosApi,
  emptyDias,
  type DiaHorario,
  type Horario,
  type WorkerEstado,
} from '../../services/calendariosApi';
import { HorarioGrid } from '../../components/HorarioGrid';
import { useToast } from '../../contexts/ToastContext';

type MiHorarioProps = {
  variant: 'beezero' | 'ecodelivery' | 'operador';
  dashboardPath: string;
};

export function MiHorario({ variant, dashboardPath }: MiHorarioProps) {
  const toast = useToast();
  const [estado, setEstado] = useState<WorkerEstado | null>(null);
  const [dias, setDias] = useState<Record<string, DiaHorario>>({});
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
      const data = await calendariosApi.getMiEstado();
      setEstado(data);
      if (data.puedeEnviar && data.habilitacion) {
        const base = data.baseParaFormulario?.dias
          || emptyDias(data.habilitacion.fechaDesde, data.habilitacion.fechaHasta);
        setDias(base);
      }
    } catch (err) {
      toast.show(calendariosApi.parseError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const enviar = async () => {
    if (!estado?.habilitacion) return;
    setEnviando(true);
    try {
      await calendariosApi.enviarHorario({
        dias,
        fechaDesde: estado.habilitacion.fechaDesde,
        fechaHasta: estado.habilitacion.fechaHasta,
      });
      toast.show('Horario enviado. Ya no puedes modificarlo.', 'success');
      await load();
    } catch (err) {
      toast.show(calendariosApi.parseError(err), 'error');
    } finally {
      setEnviando(false);
    }
  };

  const horarioVisible: Horario | null = estado?.horarioActivo || estado?.ultimoHorario || null;

  return (
    <div className="space-y-6">
      <a href={dashboardPath} className={`text-sm font-medium ${linkClass}`}>
        ← Volver al panel
      </a>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi horario de trabajo</h1>
        <p className="text-gray-600 text-sm mt-1">
          Completa el rango que te asignó admin. Una vez enviado, solo admin puede editarlo.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : estado?.puedeEnviar && estado.habilitacion ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
            <p className="font-semibold text-green-800">Ventana abierta</p>
            <p className="text-green-700">
              Del {estado.habilitacion.fechaDesde} al {estado.habilitacion.fechaHasta}
            </p>
            {estado.baseParaFormulario && (
              <p className="text-green-600 mt-1">Pre-cargado con tu último horario enviado.</p>
            )}
          </div>
          <HorarioGrid
            fechaDesde={estado.habilitacion.fechaDesde}
            fechaHasta={estado.habilitacion.fechaHasta}
            dias={dias}
            onChange={setDias}
          />
          <button
            type="button"
            disabled={enviando}
            onClick={() => void enviar()}
            className="px-6 py-3 rounded-xl bg-gray-900 text-white font-medium disabled:opacity-50"
          >
            {enviando ? 'Enviando…' : 'Enviar horario'}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border p-4 text-gray-600">
          {estado?.habilitacion?.habilitada === false && !horarioVisible
            ? 'Tu admin aún no te habilitó para llenar horario.'
            : 'No tienes una ventana abierta para editar.'}
        </div>
      )}

      {horarioVisible && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Horario vigente</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              horarioVisible.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {horarioVisible.estado === 'activo' ? 'Confirmado' : 'Enviado — pendiente revisión admin'}
            </span>
            {horarioVisible.editadoPor && (
              <span className="text-xs text-gray-500">Editado por admin</span>
            )}
          </div>
          <HorarioGrid
            fechaDesde={horarioVisible.fechaDesde}
            fechaHasta={horarioVisible.fechaHasta}
            dias={horarioVisible.dias}
            onChange={() => {}}
            readOnly
          />
        </div>
      )}

      {estado?.historial && estado.historial.length > 1 && (
        <div className="text-sm text-gray-500">
          Historial: {estado.historial.length} envíos registrados
        </div>
      )}
    </div>
  );
}
