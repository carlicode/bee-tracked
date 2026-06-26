import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { permisosApi, type Permiso, type PermisoEstado } from '../../services/permisosApi';
import { useToast } from '../../contexts/ToastContext';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../../components/Pagination';

type Filter = 'pendiente' | 'aprobado' | 'rechazado' | 'all';

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

export function GestionPermisos() {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('pendiente');
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pagination = usePagination(permisos, 20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await permisosApi.getAdminPermisos(filter);
      setPermisos(list);
    } catch (err) {
      toast.show(permisosApi.parseError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAprobar = async (id: string) => {
    setRespondingId(id);
    try {
      await permisosApi.responder(id, 'aprobar');
      toast.show('Permiso aprobado', 'success');
      await load();
    } catch (err) {
      toast.show(permisosApi.parseError(err), 'error');
    } finally {
      setRespondingId(null);
    }
  };

  const handleRechazar = async (id: string) => {
    setRespondingId(id);
    try {
      await permisosApi.responder(id, 'rechazar', rejectReason.trim() || undefined);
      toast.show('Permiso rechazado', 'success');
      setRejectId(null);
      setRejectReason('');
      await load();
    } catch (err) {
      toast.show(permisosApi.parseError(err), 'error');
    } finally {
      setRespondingId(null);
    }
  };

  const filters: { id: Filter; label: string }[] = [
    { id: 'pendiente', label: 'Pendientes' },
    { id: 'aprobado', label: 'Aprobados' },
    { id: 'rechazado', label: 'Rechazados' },
    { id: 'all', label: 'Todos' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          to="/admin/dashboard"
          className="text-sm font-medium text-beeadmin-purple hover:text-beeadmin-purple-dark"
        >
          ← Volver al panel
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestión de permisos</h1>
        <p className="text-gray-600 text-sm mt-1">
          Aprueba o rechaza solicitudes de días libre de drivers y bikers.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === id
                ? 'bg-beeadmin-purple text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-violet-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Cargando…</p>
      ) : permisos.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center bg-white rounded-xl border border-gray-200">
          No hay permisos en este filtro.
        </p>
      ) : (
        <div className="space-y-4">
          {pagination.pageItems.map((p) => (
            <div
              key={p.permisoId}
              className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{p.userName}</p>
                  <p className="text-sm text-gray-500">
                    {p.userType} · {formatDate(p.fecha)}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    <strong>Motivo:</strong> {p.motivo}
                  </p>
                  {p.nota && (
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Nota:</strong> {p.nota}
                    </p>
                  )}
                  {p.reemplazo && (
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Reemplazo:</strong> {p.reemplazo}
                    </p>
                  )}
                  {p.estado === 'rechazado' && p.razonRechazo && (
                    <p className="text-sm text-red-600 mt-1">
                      <strong>Rechazo:</strong> {p.razonRechazo}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full uppercase ${estadoStyles[p.estado as PermisoEstado]}`}
                >
                  {p.estado}
                </span>
              </div>

              {p.estado === 'pendiente' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={respondingId === p.permisoId}
                    onClick={() => void handleAprobar(p.permisoId)}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    ✓ Aprobar
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === p.permisoId}
                    onClick={() => {
                      setRejectId(p.permisoId);
                      setRejectReason('');
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    ✗ Rechazar
                  </button>
                </div>
              )}

              {rejectId === p.permisoId && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Motivo del rechazo (opcional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRejectId(null)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={respondingId === p.permisoId}
                      onClick={() => void handleRechazar(p.permisoId)}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg disabled:opacity-50"
                    >
                      Confirmar rechazo
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onGoTo={pagination.goTo}
            onPrev={pagination.prev}
            onNext={pagination.next}
          />
        </div>
      )}
    </div>
  );
}
