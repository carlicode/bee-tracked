import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extraordinariosApi, type Extraordinario } from '../../services/extraordinariosApi';
import { useToast } from '../../contexts/ToastContext';

type ExtraordinariosWorkerProps = {
  variant: 'beezero' | 'ecodelivery' | 'operador';
  dashboardPath: string;
};

export function ExtraordinariosWorker({ variant, dashboardPath }: ExtraordinariosWorkerProps) {
  const toast = useToast();
  const [list, setList] = useState<Extraordinario[]>([]);
  const [loading, setLoading] = useState(true);
  const [inscribiendo, setInscribiendo] = useState<string | null>(null);

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

  const inscribirse = async (extra: Extraordinario) => {
    setInscribiendo(extra.extraId);
    try {
      await extraordinariosApi.inscribirse(extra.extraId, extra.horaInicioSugerida, extra.horaFinSugerida);
      toast.show('Inscripción enviada. RRHH debe aprobarla.', 'success');
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
        list.map((e) => (
          <div key={e.extraId} className="rounded-xl border p-4 flex flex-wrap justify-between gap-3">
            <div>
              <p className="font-semibold">{e.titulo}</p>
              <p className="text-sm text-gray-600">{e.fecha}</p>
              {e.descripcion && <p className="text-sm mt-1">{e.descripcion}</p>}
              <p className="text-xs text-gray-500 mt-1">Horario sugerido: {e.horaInicioSugerida}–{e.horaFinSugerida}</p>
            </div>
            <button
              type="button"
              disabled={inscribiendo === e.extraId}
              onClick={() => void inscribirse(e)}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm self-start disabled:opacity-50"
            >
              Inscribirme
            </button>
          </div>
        ))
      )}
    </div>
  );
}
