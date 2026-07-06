import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminBackNav } from './AdminBackNav';
import {
  asistenciaApi,
  type DiaAsistencia,
  type ReporteAsistencia,
  type TrabajadorTiempoReal,
} from '../../services/asistenciaApi';
import { useToast } from '../../contexts/ToastContext';
import { storage } from '../../services/storage';

type Tab = 'tiempo-real' | 'reporte' | 'trabajador';

const POLL_MS = 60_000;

const estadoBadge: Record<string, { label: string; className: string }> = {
  presente: { label: 'Presente', className: 'bg-green-100 text-green-800' },
  ok: { label: 'OK', className: 'bg-green-100 text-green-800' },
  tarde: { label: 'Tarde', className: 'bg-orange-100 text-orange-800' },
  tardanza: { label: 'Tarde', className: 'bg-orange-100 text-orange-800' },
  ausente: { label: 'Ausente', className: 'bg-red-100 text-red-800' },
  ausencia: { label: 'Ausente', className: 'bg-red-100 text-red-800' },
  pendiente: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
  permiso: { label: 'Permiso', className: 'bg-blue-100 text-blue-800' },
  libre: { label: 'Libre', className: 'bg-gray-100 text-gray-600' },
  turno_sin_horario: { label: 'Sin horario', className: 'bg-purple-100 text-purple-800' },
  salida_temprana: { label: 'Salió antes', className: 'bg-amber-100 text-amber-900' },
  salida_tarde: { label: 'Cerró tarde', className: 'bg-indigo-100 text-indigo-800' },
  extraordinario: { label: 'Extra', className: 'bg-purple-100 text-purple-800' },
};

function badgeFor(estado: string) {
  return estadoBadge[estado] || { label: estado, className: 'bg-gray-100 text-gray-700' };
}

function resumenTrabajador(dias: DiaAsistencia[]) {
  const counts: Record<string, number> = {};
  for (const d of dias) {
    counts[d.resultado] = (counts[d.resultado] || 0) + 1;
  }
  return counts;
}

function formatHorario(inicio: string, fin: string) {
  if (!inicio && !fin) return '—';
  if (!fin) return inicio;
  return `${inicio} – ${fin}`;
}

function todayLaPaz(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}

export function AsistenciaAdmin() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('tiempo-real');

  // Tiempo real
  const [fechaReal, setFechaReal] = useState(todayLaPaz());
  const [userTypeReal, setUserTypeReal] = useState('all');
  const [trabajadores, setTrabajadores] = useState<TrabajadorTiempoReal[]>([]);
  const [resumen, setResumen] = useState({
    debeTrabajar: 0,
    trabajandoAhora: 0,
    ausentes: 0,
    libre: 0,
    sinHorario: 0,
    pendientes: 0,
  });
  const [countdown, setCountdown] = useState(POLL_MS / 1000);
  const [loadingReal, setLoadingReal] = useState(false);

  // Reporte histórico
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [userType, setUserType] = useState('all');
  const [reporte, setReporte] = useState<ReporteAsistencia[]>([]);
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Por trabajador
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDia, setSelectedDia] = useState<DiaAsistencia | null>(null);

  useEffect(() => {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 7);
    setFechaDesde(inicio.toISOString().slice(0, 10));
    setFechaHasta(hoy.toISOString().slice(0, 10));
  }, []);

  const cargarTiempoReal = useCallback(async () => {
    setLoadingReal(true);
    try {
      const data = await asistenciaApi.getTiempoReal(fechaReal, userTypeReal);
      setTrabajadores(data.trabajadores);
      setResumen(data.resumen);
      setCountdown(POLL_MS / 1000);
    } catch (err) {
      toast.show(asistenciaApi.parseError(err), 'error');
    } finally {
      setLoadingReal(false);
    }
  }, [fechaReal, userTypeReal, toast]);

  useEffect(() => {
    if (tab !== 'tiempo-real') return;
    void cargarTiempoReal();
  }, [tab, cargarTiempoReal]);

  useEffect(() => {
    if (tab !== 'tiempo-real') return;
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          void cargarTiempoReal();
          return POLL_MS / 1000;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [tab, cargarTiempoReal]);

  const calcular = useCallback(async (generarMultas = false) => {
    if (!fechaDesde || !fechaHasta) return;
    setLoadingReporte(true);
    try {
      const data = await asistenciaApi.getReporte(fechaDesde, fechaHasta, userType, generarMultas);
      setReporte(data);
      if (generarMultas) toast.show('Reporte calculado y multas generadas donde aplica', 'success');
    } catch (err) {
      toast.show(asistenciaApi.parseError(err), 'error');
    } finally {
      setLoadingReporte(false);
    }
  }, [fechaDesde, fechaHasta, userType, toast]);

  const exportCsv = () => {
    const url = asistenciaApi.exportCsvUrl(fechaDesde, fechaHasta, userType);
    const headers: Record<string, string> = {};
    const token = storage.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const sessionId = storage.getSessionId();
    if (sessionId) headers['X-Session-Id'] = sessionId;
    const username = storage.getUsername();
    if (username) headers['X-User-Id'] = username;
    fetch(url, { headers })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `asistencia-${fechaDesde}_${fechaHasta}.csv`;
        a.click();
      })
      .catch(() => toast.show('Error al exportar CSV', 'error'));
  };

  const trabajadorSeleccionado = useMemo(
    () => reporte.find((u) => u.userId === selectedUserId) || null,
    [reporte, selectedUserId]
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'tiempo-real', label: 'Tiempo real' },
    { id: 'reporte', label: 'Reporte histórico' },
    { id: 'trabajador', label: 'Por trabajador' },
  ];

  return (
    <div className="space-y-6">
      <AdminBackNav currentPath="/admin/asistencia" />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asistencia</h1>
        <p className="text-gray-600 text-sm mt-1">
          Compara horarios asignados vs turnos reales. Puntualidad, ausencias y cobertura en tiempo real.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === t.id ? 'bg-beeadmin-purple text-white' : 'bg-white border text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Tiempo real ── */}
      {tab === 'tiempo-real' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-sm">
              Fecha
              <input
                type="date"
                className="block mt-1 border rounded-lg px-3 py-2"
                value={fechaReal}
                onChange={(e) => setFechaReal(e.target.value)}
              />
            </label>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={userTypeReal}
              onChange={(e) => setUserTypeReal(e.target.value)}
            >
              <option value="all">Todos los roles</option>
              <option value="beezero">BeeZero</option>
              <option value="ecodelivery">EcoDelivery</option>
              <option value="operador">Operador</option>
            </select>
            <button
              type="button"
              disabled={loadingReal}
              onClick={() => void cargarTiempoReal()}
              className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white text-sm disabled:opacity-50"
            >
              Actualizar
            </button>
            <span className="text-xs text-gray-500 pb-2">
              Auto-refresh en {countdown}s
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard label="Deberían trabajar" value={resumen.debeTrabajar} color="bg-purple-50 border-purple-200 text-purple-900" />
            <SummaryCard label="Trabajando ahora" value={resumen.trabajandoAhora} color="bg-green-50 border-green-200 text-green-900" />
            <SummaryCard label="Pendientes" value={resumen.pendientes} color="bg-yellow-50 border-yellow-200 text-yellow-900" />
            <SummaryCard label="Ausentes" value={resumen.ausentes} color="bg-red-50 border-red-200 text-red-900" />
            <SummaryCard label="Libres" value={resumen.libre} color="bg-gray-50 border-gray-200 text-gray-700" />
            <SummaryCard label="Sin horario" value={resumen.sinHorario} color="bg-indigo-50 border-indigo-200 text-indigo-900" />
          </div>

          {loadingReal && <p className="text-gray-500 text-sm">Cargando…</p>}

          {!loadingReal && (
            <div className="rounded-xl border overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 border-b">
                      <th className="px-4 py-3 font-medium">Nombre</th>
                      <th className="px-4 py-3 font-medium">Rol</th>
                      <th className="px-4 py-3 font-medium">Horario esperado</th>
                      <th className="px-4 py-3 font-medium">Inicio real</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">Retraso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trabajadores.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No hay datos para esta fecha
                        </td>
                      </tr>
                    ) : (
                      trabajadores.map((t) => {
                        const badge = badgeFor(t.estado);
                        return (
                          <tr key={`${t.userId}-${t.userName}`} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {t.userName}
                              {t.turnoActivo && (
                                <span className="ml-2 inline-flex rounded-full bg-green-500 w-2 h-2" title="Turno activo" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{t.userType}</td>
                            <td className="px-4 py-3 text-gray-700">
                              {formatHorario(t.horaEsperadaInicio, t.horaEsperadaFin)}
                            </td>
                            <td className="px-4 py-3 text-gray-700">{t.horaRealInicio || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {t.minutosRetraso > 0 && t.minutosRetraso < 9999 ? `+${t.minutosRetraso} min` : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Reporte histórico ── */}
      {tab === 'reporte' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-sm">
              Desde
              <input type="date" className="block mt-1 border rounded-lg px-3 py-2" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </label>
            <label className="text-sm">
              Hasta
              <input type="date" className="block mt-1 border rounded-lg px-3 py-2" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </label>
            <select className="border rounded-lg px-3 py-2 text-sm" value={userType} onChange={(e) => setUserType(e.target.value)}>
              <option value="all">Todos</option>
              <option value="beezero">BeeZero</option>
              <option value="ecodelivery">EcoDelivery</option>
              <option value="operador">Operador</option>
            </select>
            <button type="button" disabled={loadingReporte} onClick={() => void calcular(false)} className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white text-sm disabled:opacity-50">
              Calcular
            </button>
            <button type="button" disabled={loadingReporte} onClick={() => void calcular(true)} className="px-4 py-2 rounded-lg border border-red-400 text-red-700 text-sm disabled:opacity-50">
              Calcular + multas
            </button>
            <button type="button" onClick={exportCsv} className="px-4 py-2 rounded-lg border text-sm">
              Exportar CSV
            </button>
          </div>

          {loadingReporte && <p className="text-gray-500 text-sm">Calculando…</p>}

          {!loadingReporte && reporte.map((u) => {
            const counts = resumenTrabajador(u.dias);
            const ok = counts.ok || 0;
            const tardanzas = counts.tardanza || 0;
            const ausencias = counts.ausencia || 0;
            const isOpen = expandedUser === u.userId;

            return (
              <div key={u.userId} className="rounded-xl border overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setExpandedUser(isOpen ? null : u.userId)}
                  className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                >
                  <div>
                    <span className="font-semibold text-gray-900">{u.userName}</span>
                    <span className="ml-2 text-sm text-gray-500">({u.userType})</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">{ok} ok</span>
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">{tardanzas} tardanzas</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800">{ausencias} ausencias</span>
                    {(counts.salida_tarde || 0) > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">{counts.salida_tarde} cerró tarde</span>
                    )}
                  </div>
                </button>
                {isOpen && (
                  <div className="divide-y">
                    {u.dias.map((d) => {
                      const badge = badgeFor(d.resultado);
                      return (
                        <div key={d.fecha} className="px-4 py-2 flex flex-wrap justify-between gap-2 text-sm">
                          <span className="font-medium text-gray-700 w-24">{d.fecha}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                          <span className="text-gray-600 flex-1 min-w-[180px]">
                            {formatHorario(d.horaEsperadaInicio || '', d.horaEsperadaFin || '')}
                            {d.horaRealInicio ? ` → ${d.horaRealInicio}` : ''}
                            {d.horaRealFin ? `–${d.horaRealFin}` : ''}
                          </span>
                          <span className="text-gray-500">{d.detalle}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab Por trabajador ── */}
      {tab === 'trabajador' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-sm">
              Desde
              <input type="date" className="block mt-1 border rounded-lg px-3 py-2" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </label>
            <label className="text-sm">
              Hasta
              <input type="date" className="block mt-1 border rounded-lg px-3 py-2" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </label>
            <button
              type="button"
              disabled={loadingReporte}
              onClick={() => void calcular(false)}
              className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white text-sm disabled:opacity-50"
            >
              Cargar
            </button>
          </div>

          <label className="text-sm block max-w-md">
            Trabajador
            <select
              className="block mt-1 w-full border rounded-lg px-3 py-2"
              value={selectedUserId}
              onChange={(e) => { setSelectedUserId(e.target.value); setSelectedDia(null); }}
            >
              <option value="">— Seleccionar —</option>
              {reporte.map((u) => (
                <option key={u.userId} value={u.userId}>{u.userName} ({u.userType})</option>
              ))}
            </select>
          </label>

          {trabajadorSeleccionado && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {trabajadorSeleccionado.dias.map((d) => {
                  const badge = badgeFor(d.resultado);
                  const isSelected = selectedDia?.fecha === d.fecha;
                  return (
                    <button
                      key={d.fecha}
                      type="button"
                      onClick={() => setSelectedDia(d)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium border transition-colors ${
                        isSelected ? 'ring-2 ring-beeadmin-purple' : ''
                      } ${badge.className}`}
                      title={d.detalle}
                    >
                      {d.fecha.slice(5)}
                      <br />
                      {badge.label}
                    </button>
                  );
                })}
              </div>

              {selectedDia && (
                <div className="rounded-xl border p-4 bg-white space-y-2 text-sm">
                  <h3 className="font-semibold text-gray-900">{selectedDia.fecha}</h3>
                  <p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${badgeFor(selectedDia.resultado).className}`}>
                      {badgeFor(selectedDia.resultado).label}
                    </span>
                  </p>
                  <p className="text-gray-600">{selectedDia.detalle}</p>
                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500 mb-1">Esperado</p>
                      <p className="font-medium">
                        {formatHorario(selectedDia.horaEsperadaInicio || '', selectedDia.horaEsperadaFin || '')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500 mb-1">Real</p>
                      <p className="font-medium">
                        {selectedDia.horaRealInicio || '—'}
                        {selectedDia.horaRealFin ? ` – ${selectedDia.horaRealFin}` : ''}
                      </p>
                    </div>
                  </div>
                  {selectedDia.minutosRetraso != null && selectedDia.minutosRetraso > 0 && selectedDia.minutosRetraso < 9999 && (
                    <p className="text-orange-700">Desviación: {selectedDia.minutosRetraso} min</p>
                  )}
                  {selectedDia.turnoId && (
                    <p className="text-xs text-gray-400">Turno ID: {selectedDia.turnoId}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {!trabajadorSeleccionado && reporte.length === 0 && !loadingReporte && (
            <p className="text-gray-500 text-sm">Cargá un rango de fechas para ver trabajadores.</p>
          )}
        </div>
      )}
    </div>
  );
}
