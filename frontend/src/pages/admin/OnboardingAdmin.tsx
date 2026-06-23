import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminOnboardingApi, type OnboardingUserRow } from '../../services/onboardingApi';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';

type RolFilter = 'all' | 'Bee Zero' | 'Ecodelivery' | 'Operador';
type StatusFilter = 'all' | 'completed' | 'pending';

export function OnboardingAdmin() {
  const toast = useToast();
  const [users, setUsers] = useState<OnboardingUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);
  const [rolFilter, setRolFilter] = useState<RolFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminOnboardingApi.list();
      setUsers(list);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Error cargando onboarding', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (rolFilter !== 'all' && u.rol !== rolFilter) return false;
      const completed = u.onboarding?.completed ?? false;
      if (statusFilter === 'completed' && !completed) return false;
      if (statusFilter === 'pending' && completed) return false;
      return true;
    });
  }, [users, rolFilter, statusFilter]);

  const stats = useMemo(() => {
    const completed = users.filter((u) => u.onboarding?.completed).length;
    return { completed, pending: users.length - completed, total: users.length };
  }, [users]);

  const handleResetUser = async (usuario: string) => {
    if (!window.confirm(`¿Resetear tutorial de ${usuario}? Verá el tutorial al próximo ingreso.`)) return;
    setResetting(usuario);
    try {
      await adminOnboardingApi.resetUser(usuario);
      toast.show('Tutorial reseteado', 'success');
      await load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Error al resetear', 'error');
    } finally {
      setResetting(null);
    }
  };

  const handleResetAll = async () => {
    const label = rolFilter === 'all' ? 'todos los usuarios' : `todos los ${rolFilter}`;
    if (!window.confirm(`¿Resetear tutorial de ${label}?`)) return;
    setResetting('__all__');
    try {
      const userTypeMap: Record<string, string> = {
        'Bee Zero': 'beezero',
        Ecodelivery: 'ecodelivery',
        Operador: 'operador',
      };
      const userType = rolFilter === 'all' ? undefined : userTypeMap[rolFilter];
      const deleted = await adminOnboardingApi.resetAll(userType);
      toast.show(`Reseteados ${deleted} registro(s)`, 'success');
      await load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Error al resetear', 'error');
    } finally {
      setResetting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Primer inicio de app</h1>
          <Link to="/admin/dashboard" className="text-sm text-beeadmin-purple hover:underline">
            ← Volver al panel
          </Link>
          <p className="text-gray-600 text-sm mt-2 max-w-2xl">
            Usuarios que completaron el tutorial de bienvenida. Puedes resetear a &quot;primer inicio&quot;
            para que vuelvan a ver las instrucciones al ingresar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleResetAll()}
          disabled={resetting !== null || users.length === 0}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Reset todos{rolFilter !== 'all' ? ` (${rolFilter})` : ''}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-beeadmin-purple">{stats.completed}</p>
          <p className="text-sm text-gray-500">Completaron tutorial</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-gray-700">{stats.pending}</p>
          <p className="text-sm text-gray-500">Aún no lo vieron</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Usuarios drivers/bikers</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'Bee Zero', 'Ecodelivery', 'Operador'] as RolFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setRolFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              rolFilter === f ? 'bg-beeadmin-purple text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {f === 'all' ? 'Todos los roles' : f}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'Todos'],
          ['completed', 'Vio tutorial'],
          ['pending', 'No vio tutorial'],
        ] as [StatusFilter, string][]).map(([f, label]) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatusFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              statusFilter === f ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No hay usuarios en este filtro</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-700">Nombre</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Usuario</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Rol</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Tutorial</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Primer inicio</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => {
                  const completed = u.onboarding?.completed ?? false;
                  return (
                    <tr key={u.usuario} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{u.nombre}</td>
                      <td className="px-6 py-3 text-gray-600">{u.usuario}</td>
                      <td className="px-6 py-3 text-gray-600">{u.rol}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            completed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {completed ? 'Completado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {u.onboarding?.completedAt
                          ? new Date(u.onboarding.completedAt).toLocaleString('es-BO')
                          : '—'}
                      </td>
                      <td className="px-6 py-3">
                        {completed && (
                          <button
                            type="button"
                            onClick={() => void handleResetUser(u.usuario)}
                            disabled={resetting === u.usuario}
                            className="text-sm text-beeadmin-purple hover:underline disabled:opacity-50"
                          >
                            {resetting === u.usuario ? 'Reseteando...' : 'Reset'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
