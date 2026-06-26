import { useCallback, useEffect, useState } from 'react';
import { AdminBackNav } from './AdminBackNav';
import { multasApi, type Multa, type ReglasMultas } from '../../services/multasApi';
import { useToast } from '../../contexts/ToastContext';

export function MultasAdmin() {
  const toast = useToast();
  const [multas, setMultas] = useState<Multa[]>([]);
  const [reglas, setReglas] = useState<ReglasMultas | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingReglas, setSavingReglas] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, r] = await Promise.all([multasApi.getAdmin('activa'), multasApi.getReglas()]);
      setMultas(m);
      setReglas(r);
    } catch (err) {
      toast.show(multasApi.parseError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const dispensar = async (m: Multa) => {
    const razon = window.prompt('Motivo de dispensa (opcional)') || '';
    try {
      await multasApi.dispensar(m.userId, m.fecha, m.multaId, razon);
      toast.show('Multa dispensada', 'success');
      await load();
    } catch (err) {
      toast.show(multasApi.parseError(err), 'error');
    }
  };

  const guardarReglas = async () => {
    if (!reglas) return;
    setSavingReglas(true);
    try {
      await multasApi.saveReglas(reglas);
      toast.show('Reglas guardadas', 'success');
    } catch (err) {
      toast.show(multasApi.parseError(err), 'error');
    } finally {
      setSavingReglas(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminBackNav currentPath="/admin/multas" />
      <div>
        <h1 className="text-2xl font-bold">Multas</h1>
        <p className="text-gray-600 text-sm mt-1">Multas automáticas por tardanza o ausencia.</p>
      </div>

      {reglas && (
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="font-semibold">Reglas</h2>
          <label className="text-sm block">
            Margen (minutos sin multa)
            <input
              type="number"
              className="block mt-1 border rounded-lg px-3 py-2 w-32"
              value={reglas.margenMinutos}
              onChange={(e) => setReglas({ ...reglas, margenMinutos: Number(e.target.value) })}
            />
          </label>
          <button type="button" disabled={savingReglas} onClick={() => void guardarReglas()} className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white text-sm disabled:opacity-50">
            Guardar reglas
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : multas.length === 0 ? (
        <p className="text-gray-500">No hay multas activas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border text-left">Usuario</th>
                <th className="p-2 border">Fecha</th>
                <th className="p-2 border">Tipo</th>
                <th className="p-2 border">Min</th>
                <th className="p-2 border">Bs</th>
                <th className="p-2 border">Motivo</th>
                <th className="p-2 border"></th>
              </tr>
            </thead>
            <tbody>
              {multas.map((m) => (
                <tr key={m.multaId}>
                  <td className="p-2 border">{m.userName}</td>
                  <td className="p-2 border">{m.fecha}</td>
                  <td className="p-2 border">{m.tipo}</td>
                  <td className="p-2 border text-center">{m.minutos}</td>
                  <td className="p-2 border text-center">{m.montoBs}</td>
                  <td className="p-2 border text-gray-600">{m.motivo}</td>
                  <td className="p-2 border">
                    <button type="button" onClick={() => void dispensar(m)} className="text-sm text-beeadmin-purple">Dispensar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
