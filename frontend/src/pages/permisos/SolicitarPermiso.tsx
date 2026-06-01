import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  permisosApi,
  tomorrowDate,
  type Permiso,
  type PermisoMotivo,
  isPermisosApiEnabled,
} from '../../services/permisosApi';
import { useToast } from '../../contexts/ToastContext';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../../components/Pagination';

const MOTIVOS: PermisoMotivo[] = ['Personal', 'Salud', 'Vacaciones', 'Otro'];

type SolicitarPermisoProps = {
  variant: 'beezero' | 'ecodelivery';
};

const estadoStyles: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
};

function formatDate(s: string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function SolicitarPermiso({ variant }: SolicitarPermisoProps) {
  const isBeezero = variant === 'beezero';
  const dashboardPath = isBeezero ? '/beezero/dashboard' : '/ecodelivery/dashboard';
  const borderClass = isBeezero ? 'border-yellow-100' : 'border-green-100';
  const submitClass = isBeezero
    ? 'bg-beezero-yellow hover:bg-yellow-400 text-black'
    : 'bg-ecodelivery-green hover:bg-green-600 text-white';
  const linkClass = isBeezero ? 'text-beezero-yellow-dark' : 'text-ecodelivery-green';

  const navigate = useNavigate();
  const toast = useToast();
  const [fecha, setFecha] = useState(tomorrowDate());
  const [motivo, setMotivo] = useState<PermisoMotivo>('Personal');
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(false);
  const [misPermisos, setMisPermisos] = useState<Permiso[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const pagination = usePagination(misPermisos, 10);

  const loadMisPermisos = async () => {
    if (!isPermisosApiEnabled()) {
      setLoadingList(false);
      return;
    }
    try {
      const list = await permisosApi.getMisPermisos();
      setMisPermisos(list);
    } catch {
      toast.show('No se pudieron cargar tus solicitudes', 'error');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadMisPermisos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPermisosApiEnabled()) {
      toast.show('Backend no configurado', 'error');
      return;
    }
    setLoading(true);
    try {
      await permisosApi.solicitar({
        fecha,
        motivo,
        nota: nota.trim() || undefined,
      });
      toast.show('Permiso solicitado. Las admins serán notificadas.', 'success');
      setNota('');
      await loadMisPermisos();
      navigate(dashboardPath);
    } catch (err) {
      toast.show(permisosApi.parseError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link to={dashboardPath} className={`text-sm font-medium ${linkClass}`}>
          ← Volver al panel
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Solicitar permiso</h1>
        <p className="text-gray-600 text-sm mt-1">
          Pide un día libre con al menos un día de anticipación.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`bg-white rounded-2xl border-2 ${borderClass} p-6 space-y-5 shadow-sm`}
      >
        <div>
          <label className="block text-sm font-medium mb-1">Fecha del permiso</label>
          <input
            type="date"
            value={fecha}
            min={tomorrowDate()}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Motivo</label>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as PermisoMotivo)}
            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
            required
          >
            {MOTIVOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nota (opcional)</label>
          <textarea
            rows={3}
            maxLength={200}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
            placeholder="Detalle adicional para el admin..."
          />
          <p className="text-xs text-gray-500 mt-1">{nota.length}/200</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(dashboardPath)}
            className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 font-medium text-gray-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold disabled:opacity-50 ${submitClass}`}
          >
            {loading ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Mis solicitudes</h2>

        {loadingList ? (
          <p className="text-gray-500 text-sm">Cargando…</p>
        ) : misPermisos.length === 0 ? (
          <p className="text-gray-500 text-sm">Aún no has solicitado permisos.</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {pagination.pageItems.map((p) => (
                <li key={p.permisoId} className="py-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(p.fecha)}</p>
                    <p className="text-sm text-gray-600">
                      {p.motivo}
                      {p.nota ? ` — ${p.nota}` : ''}
                    </p>
                    {p.estado === 'rechazado' && p.razonRechazo && (
                      <p className="text-sm text-red-600 mt-1">Motivo rechazo: {p.razonRechazo}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full uppercase ${estadoStyles[p.estado] || ''}`}
                  >
                    {p.estado}
                  </span>
                </li>
              ))}
            </ul>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onGoTo={pagination.goTo}
              onPrev={pagination.prev}
              onNext={pagination.next}
            />
          </>
        )}
      </div>
    </div>
  );
}
