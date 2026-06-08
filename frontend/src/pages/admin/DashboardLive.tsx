import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { adminApi, isAdminApiEnabled, type LiveDashboardResponse, type LiveTurnoActivo } from '../../services/adminApi';
import { useToast } from '../../contexts/ToastContext';

const POLL_MS = 30_000;

function turnoKey(tipo: 'beezero' | 'ecodelivery' | 'operador', t: LiveTurnoActivo): string {
  return `${tipo}:${t.turnoId || t.userId || t.nombre}`;
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const sec = Math.floor((Date.now() - then) / 1000);
  if (sec < 5) return 'ahora';
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

function ActiveTable({
  title,
  emptyMessage,
  rows,
  showPlaca,
  showApertura,
}: {
  title: string;
  emptyMessage: string;
  rows: LiveTurnoActivo[];
  showPlaca?: boolean;
  showApertura?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-gray-500 text-sm text-center">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Hora inicio</th>
                {showPlaca && <th className="px-5 py-3 font-medium">Placa</th>}
                {showApertura && <th className="px-5 py-3 font-medium">Apertura Bs</th>}
                <th className="px-5 py-3 font-medium">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.turnoId || row.userId} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {row.nombre}
                    {row.tienePermiso && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-semibold">
                        PERMISO
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{row.horaInicio || '—'}</td>
                  {showPlaca && <td className="px-5 py-3 text-gray-700">{row.placa || '—'}</td>}
                  {showApertura && (
                    <td className="px-5 py-3 text-gray-700">
                      {row.aperturaCaja != null ? `Bs ${row.aperturaCaja}` : '—'}
                    </td>
                  )}
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 text-xs font-semibold">
                      {row.tiempoTranscurrido}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function DashboardLive() {
  const { show: showToast } = useToast();
  const { getUserType } = useAuth();
  const isOperador = getUserType() === 'operador';
  const backPath = isOperador ? '/operador/dashboard' : '/admin/dashboard';
  const backLabel = isOperador ? '← Panel operador' : '← Panel administración';
  const [data, setData] = useState<LiveDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const prevKeysRef = useRef<Set<string> | null>(null);
  const prevNamesRef = useRef<Map<string, string>>(new Map());
  const hasDataRef = useRef(false);

  const detectChanges = useCallback(
    (payload: LiveDashboardResponse) => {
      const currentKeys = new Set<string>();
      const currentNames = new Map<string, string>();

      for (const t of payload.beezero.activos) {
        const k = turnoKey('beezero', t);
        currentKeys.add(k);
        currentNames.set(k, t.nombre);
      }
      for (const t of payload.ecodelivery.activos) {
        const k = turnoKey('ecodelivery', t);
        currentKeys.add(k);
        currentNames.set(k, t.nombre);
      }
      for (const t of (payload.operador?.activos ?? [])) {
        const k = turnoKey('operador', t);
        currentKeys.add(k);
        currentNames.set(k, t.nombre);
      }

      const prev = prevKeysRef.current;
      if (prev) {
        for (const k of currentKeys) {
          if (!prev.has(k)) {
            showToast(`🟢 ${currentNames.get(k) || 'Alguien'} inició turno`, 'success');
          }
        }
        for (const k of prev) {
          if (!currentKeys.has(k)) {
            showToast(`⚪ ${prevNamesRef.current.get(k) || 'Alguien'} cerró turno`, 'info');
          }
        }
      }

      prevKeysRef.current = currentKeys;
      prevNamesRef.current = currentNames;
    },
    [showToast],
  );

  const fetchLive = useCallback(
    async (manual = false) => {
      if (!isAdminApiEnabled()) {
        setError('Configura VITE_API_URL para usar el panel admin.');
        setLoading(false);
        return;
      }
      if (manual) setRefreshing(true);
      else if (!hasDataRef.current) setLoading(true);

      try {
        const payload = await adminApi.getLiveDashboard();
        detectChanges(payload);
        setData(payload);
        hasDataRef.current = true;
        setError('');
      } catch (e) {
        setError(adminApi.parseError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [detectChanges],
  );

  useEffect(() => {
    void fetchLive();
    const interval = setInterval(() => void fetchLive(), POLL_MS);
    return () => clearInterval(interval);
  }, [fetchLive]);

  const resumen = data?.resumen;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            to={backPath}
            className="text-sm text-beeadmin-purple hover:underline mb-2 inline-block"
          >
            {backLabel}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard en tiempo real</h1>
          <p className="mt-1 text-gray-600 text-sm">
            Turnos activos hoy (hora Bolivia, GMT-4) · actualización automática cada 30s
            {resumen?.timestamp && (
              <span className="text-gray-400"> · {formatRelativeTime(resumen.timestamp)}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchLive(true)}
          disabled={refreshing}
          className="self-start px-4 py-2 rounded-xl bg-beeadmin-purple text-white text-sm font-semibold hover:bg-beeadmin-purple-dark disabled:opacity-60 transition"
        >
          {refreshing ? 'Actualizando…' : 'Actualizar ahora'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading && !data ? (
        <p className="text-gray-500 text-sm py-12 text-center">Cargando turnos activos…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-medium text-emerald-800">BeeZero activos</p>
              <p className="mt-2 text-3xl font-bold text-emerald-900">
                {data?.beezero.totalActivos ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-5">
              <p className="text-sm font-medium text-sky-800">EcoDelivery activos</p>
              <p className="mt-2 text-3xl font-bold text-sky-900">
                {data?.ecodelivery.totalActivos ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-5">
              <p className="text-sm font-medium text-orange-800">Operadores activos</p>
              <p className="mt-2 text-3xl font-bold text-orange-900">
                {data?.operador?.totalActivos ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-5">
              <p className="text-sm font-medium text-violet-800">Total activos</p>
              <p className="mt-2 text-3xl font-bold text-violet-900">
                {resumen?.totalActivos ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-5">
              <p className="text-sm font-medium text-gray-700">Carreras hoy</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{resumen?.carrerasHoy ?? 0}</p>
              <p className="mt-1 text-xs text-gray-500">Próximamente conteo automático</p>
            </div>
          </div>

          <ActiveTable
            title="BeeZero trabajando"
            emptyMessage="Nadie de BeeZero está trabajando ahora"
            rows={data?.beezero.activos ?? []}
            showPlaca
            showApertura
          />

          <ActiveTable
            title="EcoDelivery trabajando"
            emptyMessage="Nadie de EcoDelivery está trabajando ahora"
            rows={data?.ecodelivery.activos ?? []}
          />

          <ActiveTable
            title="Operadores trabajando"
            emptyMessage="Ningún operador está trabajando ahora"
            rows={data?.operador?.activos ?? []}
          />
        </>
      )}
    </div>
  );
}
