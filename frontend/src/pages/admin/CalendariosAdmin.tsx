import { useCallback, useEffect, useState } from 'react';
import { AdminBackNav } from './AdminBackNav';
import {
  calendariosApi,
  type DiaHorario,
  type Horario,
  type VentanaAbierta,
  type FilaVisual,
} from '../../services/calendariosApi';
import { adminApi, type AdminUser } from '../../services/adminApi';
import { HorarioGrid } from '../../components/HorarioGrid';
import { useToast } from '../../contexts/ToastContext';

type Tab = 'habilitar' | 'pendientes' | 'visual';

const WORKER_ROLES = new Set(['beezero', 'ecodelivery', 'operador']);

export function CalendariosAdmin() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('habilitar');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [ventanas, setVentanas] = useState<VentanaAbierta[]>([]);
  const [pendientes, setPendientes] = useState<Horario[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [editHorario, setEditHorario] = useState<Horario | null>(null);
  const [editDias, setEditDias] = useState<Record<string, DiaHorario>>({});
  const [visualDesde, setVisualDesde] = useState('');
  const [visualHasta, setVisualHasta] = useState('');
  const [visualRows, setVisualRows] = useState<FilaVisual[]>([]);
  const [visualFechas, setVisualFechas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const workers = users.filter((u) => WORKER_ROLES.has(u.rol));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, v, p] = await Promise.all([
        adminApi.getUsers(),
        calendariosApi.getVentanas(),
        calendariosApi.getPendientes(),
      ]);
      setUsers(u);
      setVentanas(v);
      setPendientes(p);
    } catch (err) {
      toast.show(calendariosApi.parseError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const habilitar = async () => {
    const user = workers.find((u) => u.nombre === selectedUser || u.usuario === selectedUser);
    if (!user || !fechaDesde || !fechaHasta) {
      toast.show('Selecciona trabajador y rango de fechas', 'error');
      return;
    }
    setSaving(true);
    try {
      await calendariosApi.habilitar({
        userId: user.usuario,
        userName: user.nombre,
        userType: user.rol,
        fechaDesde,
        fechaHasta,
      });
      toast.show(`Ventana abierta para ${user.nombre}`, 'success');
      await load();
    } catch (err) {
      toast.show(calendariosApi.parseError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const abrirEdicion = (h: Horario) => {
    setEditHorario(h);
    setEditDias({ ...h.dias });
  };

  const guardarEdicion = async () => {
    if (!editHorario) return;
    setSaving(true);
    try {
      await calendariosApi.editarHorario(editHorario.userName, editHorario.horarioId, editDias, true);
      toast.show('Horario guardado', 'success');
      setEditHorario(null);
      await load();
    } catch (err) {
      toast.show(calendariosApi.parseError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const rehabilitar = async (h: Horario) => {
    try {
      await calendariosApi.rehabilitar({
        userId: h.userId,
        userName: h.userName,
        userType: h.userType,
      });
      toast.show('Worker puede editar de nuevo desde la versión actual', 'success');
      await load();
    } catch (err) {
      toast.show(calendariosApi.parseError(err), 'error');
    }
  };

  const cargarVisual = async () => {
    if (!visualDesde || !visualHasta) return;
    try {
      const data = await calendariosApi.getVisual(visualDesde, visualHasta);
      setVisualFechas(data.fechas);
      setVisualRows(data.rows);
    } catch (err) {
      toast.show(calendariosApi.parseError(err), 'error');
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'habilitar', label: 'Habilitar' },
    { id: 'pendientes', label: `Recibidos (${pendientes.length})` },
    { id: 'visual', label: 'Calendario visual' },
  ];

  return (
    <div className="space-y-6">
      <AdminBackNav currentPath="/admin/calendarios" />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Horarios de trabajo</h1>
        <p className="text-gray-600 text-sm mt-1">
          Habilita ventanas, revisa envíos de trabajadores y edita horarios oficiales.
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

      {loading && <p className="text-gray-500 text-sm">Cargando…</p>}

      {tab === 'habilitar' && !loading && (
        <div className="space-y-6">
          <div className="rounded-xl border p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <label className="text-sm sm:col-span-2">
              Trabajador
              <select
                className="block mt-1 w-full border rounded-lg px-3 py-2"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {workers.map((u) => (
                  <option key={u.usuario} value={u.nombre}>
                    {u.nombre} ({u.rol})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Desde
              <input type="date" className="block mt-1 w-full border rounded-lg px-3 py-2" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </label>
            <label className="text-sm">
              Hasta (máx. 35 días)
              <input type="date" className="block mt-1 w-full border rounded-lg px-3 py-2" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </label>
            <button type="button" disabled={saving} onClick={() => void habilitar()} className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white text-sm disabled:opacity-50">
              Habilitar envío
            </button>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Esperando envío ({ventanas.length})</h2>
            {ventanas.length === 0 ? (
              <p className="text-gray-500 text-sm">Nadie con ventana abierta.</p>
            ) : (
              <div className="space-y-2">
                {ventanas.map((v) => (
                  <div key={v.userId} className="rounded-lg border p-3 flex flex-wrap justify-between gap-2 text-sm">
                    <span><strong>{v.userName}</strong> · {v.userType}</span>
                    <span className="text-gray-600">{v.fechaDesde} → {v.fechaHasta}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'pendientes' && !loading && (
        <div className="space-y-4">
          {pendientes.length === 0 ? (
            <p className="text-gray-500">No hay horarios enviados pendientes de revisión.</p>
          ) : (
            pendientes.map((h) => (
              <div key={h.horarioId} className="rounded-xl border p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold">{h.userName}</p>
                    <p className="text-sm text-gray-600">{h.fechaDesde} → {h.fechaHasta} · {h.estado}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => abrirEdicion(h)} className="px-3 py-1 rounded-lg bg-beeadmin-purple text-white text-sm">
                      Ver / editar
                    </button>
                    <button type="button" onClick={() => void rehabilitar(h)} className="px-3 py-1 rounded-lg border text-sm">
                      Re-habilitar worker
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {editHorario && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 space-y-4 my-8">
                <h2 className="text-lg font-bold">Editar horario — {editHorario.userName}</h2>
                <HorarioGrid
                  fechaDesde={editHorario.fechaDesde}
                  fechaHasta={editHorario.fechaHasta}
                  dias={editDias}
                  onChange={setEditDias}
                />
                <div className="flex gap-2">
                  <button type="button" disabled={saving} onClick={() => void guardarEdicion()} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm disabled:opacity-50">
                    Guardar como horario oficial
                  </button>
                  <button type="button" onClick={() => setEditHorario(null)} className="px-4 py-2 rounded-lg border text-sm">
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'visual' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-sm">
              Desde
              <input type="date" className="block mt-1 border rounded-lg px-3 py-2" value={visualDesde} onChange={(e) => setVisualDesde(e.target.value)} />
            </label>
            <label className="text-sm">
              Hasta
              <input type="date" className="block mt-1 border rounded-lg px-3 py-2" value={visualHasta} onChange={(e) => setVisualHasta(e.target.value)} />
            </label>
            <button type="button" onClick={() => void cargarVisual()} className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white text-sm">
              Cargar
            </button>
          </div>

          {visualRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 border sticky left-0 bg-gray-50">Trabajador</th>
                    {visualFechas.map((f) => (
                      <th key={f} className="p-1 border whitespace-nowrap">{f.slice(5)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visualRows.map((row) => (
                    <tr key={row.horarioId}>
                      <td className="p-2 border sticky left-0 bg-white font-medium whitespace-nowrap">
                        {row.userName}
                        <span className="block text-gray-400">{row.estado}</span>
                      </td>
                      {visualFechas.map((f) => {
                        const c = row.celdas[f];
                        const bg =
                          c?.tipo === 'trabaja' ? 'bg-green-100' :
                          c?.tipo === 'libre' ? 'bg-gray-50' : 'bg-white';
                        return (
                          <td key={f} className={`p-1 border text-center ${bg}`} title={c?.tipo === 'trabaja' ? `${c.horaInicio}–${c.horaFin}` : c?.tipo}>
                            {c?.tipo === 'trabaja' ? `${c.horaInicio?.slice(0, 5)}` : c?.tipo === 'libre' ? '—' : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
