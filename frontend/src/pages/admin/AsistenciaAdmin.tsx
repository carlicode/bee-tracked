import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { calendariosApi } from '../../services/calendariosApi';
import { asistenciaApi, type ReporteAsistencia } from '../../services/asistenciaApi';
import { useToast } from '../../contexts/ToastContext';
import { storage } from '../../services/storage';

const resultadoStyles: Record<string, string> = {
  ok: 'text-green-700',
  tardanza: 'text-orange-700',
  ausencia: 'text-red-700',
  permiso: 'text-blue-700',
  extraordinario: 'text-purple-700',
  libre: 'text-gray-500',
};

export function AsistenciaAdmin() {
  const toast = useToast();
  const [semana, setSemana] = useState('');
  const [userType, setUserType] = useState('all');
  const [reporte, setReporte] = useState<ReporteAsistencia[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calendariosApi.getSemanaActual().then((m) => setSemana(m.semana)).catch(() => {});
  }, []);

  const calcular = useCallback(async (generarMultas = false) => {
    if (!semana) return;
    setLoading(true);
    try {
      const data = await asistenciaApi.getReporte(semana, userType, generarMultas);
      setReporte(data);
      if (generarMultas) toast.show('Reporte calculado y multas generadas donde aplica', 'success');
    } catch (err) {
      toast.show(asistenciaApi.parseError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [semana, userType, toast]);

  const exportCsv = () => {
    const url = asistenciaApi.exportCsvUrl(semana, userType);
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
        a.download = `asistencia-${semana}.csv`;
        a.click();
      })
      .catch(() => toast.show('Error al exportar CSV', 'error'));
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/dashboard" className="text-sm font-medium text-beeadmin-purple">← Volver al panel</Link>
      <div>
        <h1 className="text-2xl font-bold">Asistencia</h1>
        <p className="text-gray-600 text-sm mt-1">Compara calendario publicado vs turnos reales.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          Semana
          <input className="block mt-1 border rounded-lg px-3 py-2" value={semana} onChange={(e) => setSemana(e.target.value)} />
        </label>
        <select className="border rounded-lg px-3 py-2" value={userType} onChange={(e) => setUserType(e.target.value)}>
          <option value="all">Todos</option>
          <option value="beezero">BeeZero</option>
          <option value="ecodelivery">EcoDelivery</option>
          <option value="operador">Operador</option>
        </select>
        <button type="button" disabled={loading} onClick={() => void calcular(false)} className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white text-sm disabled:opacity-50">
          Calcular
        </button>
        <button type="button" disabled={loading} onClick={() => void calcular(true)} className="px-4 py-2 rounded-lg border border-red-400 text-red-700 text-sm disabled:opacity-50">
          Calcular + multas
        </button>
        <button type="button" onClick={exportCsv} className="px-4 py-2 rounded-lg border text-sm">
          Exportar CSV
        </button>
      </div>

      {loading && <p className="text-gray-500">Calculando…</p>}

      {!loading && reporte.map((u) => (
        <div key={u.userId} className="rounded-xl border overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 font-semibold">{u.userName} <span className="text-sm text-gray-500">({u.userType})</span></div>
          <div className="divide-y">
            {u.dias.map((d) => (
              <div key={d.fecha} className="px-4 py-2 flex flex-wrap justify-between gap-2 text-sm">
                <span>{d.fecha}</span>
                <span className={resultadoStyles[d.resultado] || ''}>{d.resultado}</span>
                <span className="text-gray-600 flex-1 min-w-[200px]">{d.detalle}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
