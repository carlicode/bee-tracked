import { useCallback, useEffect, useMemo, useState } from 'react';
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
type ModoVisual = 'cobertura' | 'personas';

const USER_TYPE_COLOR: Record<string, string> = {
  beezero: 'bg-yellow-300 text-yellow-900',
  'bee zero': 'bg-yellow-300 text-yellow-900',
  'Bee Zero': 'bg-yellow-300 text-yellow-900',
  ecodelivery: 'bg-purple-300 text-purple-900',
  Ecodelivery: 'bg-purple-300 text-purple-900',
  operador: 'bg-blue-300 text-blue-900',
  Operador: 'bg-blue-300 text-blue-900',
};

function colorForType(userType: string) {
  return USER_TYPE_COLOR[userType] || 'bg-gray-200 text-gray-800';
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** Genera slots de 30 min entre el min y max de la cobertura */
function buildSlots(rows: FilaVisual[], fechas: string[]): string[] {
  let minMin = 24 * 60;
  let maxMin = 0;
  for (const row of rows) {
    for (const f of fechas) {
      const c = row.celdas[f];
      if (c?.tipo !== 'trabaja') continue;
      const turnos = c.turnos ?? (c.horaInicio && c.horaFin ? [{ inicio: c.horaInicio, fin: c.horaFin }] : []);
      for (const t of turnos) {
        if (t.inicio) minMin = Math.min(minMin, timeToMin(t.inicio));
        if (t.fin) maxMin = Math.max(maxMin, timeToMin(t.fin));
      }
    }
  }
  if (minMin >= maxMin) return [];
  const slots: string[] = [];
  for (let m = minMin; m < maxMin; m += 30) {
    slots.push(minToTime(m));
  }
  return slots;
}

/** ¿Trabaja este worker en esta fecha en este slot? */
function trabajaEnSlot(row: FilaVisual, fecha: string, slotMin: number): boolean {
  const c = row.celdas[fecha];
  if (c?.tipo !== 'trabaja') return false;
  const turnos = c.turnos ?? (c.horaInicio && c.horaFin ? [{ inicio: c.horaInicio, fin: c.horaFin }] : []);
  return turnos.some((t) => t.inicio && t.fin && slotMin >= timeToMin(t.inicio) && slotMin < timeToMin(t.fin));
}

const WORKER_ROLES = new Set(['Bee Zero', 'Ecodelivery', 'Operador']);

function VisualTab({
  visualDesde, setVisualDesde,
  visualHasta, setVisualHasta,
  visualRows, visualFechas,
  modoVisual, setModoVisual,
  filterRolVisual, setFilterRolVisual,
  onCargar,
}: {
  visualDesde: string; setVisualDesde: (v: string) => void;
  visualHasta: string; setVisualHasta: (v: string) => void;
  visualRows: FilaVisual[]; visualFechas: string[];
  modoVisual: ModoVisual; setModoVisual: (m: ModoVisual) => void;
  filterRolVisual: string; setFilterRolVisual: (r: string) => void;
  onCargar: () => void;
}) {
  const filteredRows = useMemo(() =>
    filterRolVisual
      ? visualRows.filter((r) => r.userType === filterRolVisual || r.userType.toLowerCase() === filterRolVisual.toLowerCase())
      : visualRows,
    [visualRows, filterRolVisual]
  );

  const slots = useMemo(() => buildSlots(filteredRows, visualFechas), [filteredRows, visualFechas]);

  const DAY_LABELS: Record<number, string> = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };
  function dayLabel(f: string) {
    const d = new Date(`${f}T12:00:00`);
    return DAY_LABELS[d.getDay()] ?? '';
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          Desde
          <input type="date" className="block mt-1 border rounded-lg px-3 py-2" value={visualDesde} onChange={(e) => setVisualDesde(e.target.value)} />
        </label>
        <label className="text-sm">
          Hasta
          <input type="date" className="block mt-1 border rounded-lg px-3 py-2" value={visualHasta} onChange={(e) => setVisualHasta(e.target.value)} />
        </label>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filterRolVisual}
          onChange={(e) => setFilterRolVisual(e.target.value)}
        >
          <option value="">Todos los roles</option>
          <option value="beezero">BeeZero</option>
          <option value="ecodelivery">EcoDelivery</option>
          <option value="operador">Operador</option>
        </select>
        <button type="button" onClick={onCargar} className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white text-sm">
          Cargar
        </button>

        {filteredRows.length > 0 && (
          <div className="flex rounded-lg border overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setModoVisual('cobertura')}
              className={`px-3 py-2 ${modoVisual === 'cobertura' ? 'bg-beeadmin-purple text-white' : 'bg-white text-gray-700'}`}
            >
              Cobertura horaria
            </button>
            <button
              type="button"
              onClick={() => setModoVisual('personas')}
              className={`px-3 py-2 ${modoVisual === 'personas' ? 'bg-beeadmin-purple text-white' : 'bg-white text-gray-700'}`}
            >
              Por persona
            </button>
          </div>
        )}
      </div>

      {/* Leyenda */}
      {filteredRows.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-yellow-300 text-yellow-900 font-medium">BeeZero</span>
          <span className="px-2 py-1 rounded bg-purple-300 text-purple-900 font-medium">EcoDelivery</span>
          <span className="px-2 py-1 rounded bg-blue-300 text-blue-900 font-medium">Operador</span>
        </div>
      )}

      {/* Grilla de cobertura: filas = slots horarios, columnas = fechas */}
      {modoVisual === 'cobertura' && filteredRows.length > 0 && slots.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-xs border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 border text-left font-medium text-gray-600 sticky left-0 bg-gray-50 w-16">Hora</th>
                {visualFechas.map((f) => (
                  <th key={f} className="px-2 py-2 border text-center font-medium text-gray-700 min-w-[90px]">
                    <span className="block text-gray-400 font-normal">{dayLabel(f)}</span>
                    {f.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const slotMin = timeToMin(slot);
                const isHalfHour = slotMin % 60 === 30;
                return (
                  <tr key={slot} className={isHalfHour ? 'bg-gray-50/40' : ''}>
                    <td className="px-3 py-1 border text-gray-500 sticky left-0 bg-white font-mono font-medium">
                      {slot}
                    </td>
                    {visualFechas.map((f) => {
                      const presentes = filteredRows.filter((r) => trabajaEnSlot(r, f, slotMin));
                      return (
                        <td key={f} className="px-1 py-1 border align-top">
                          {presentes.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {presentes.map((r) => (
                                <span
                                  key={r.userId}
                                  className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium leading-tight truncate max-w-[85px] ${colorForType(r.userType)}`}
                                  title={`${r.userName} (${r.userType})`}
                                >
                                  {r.userName.split(' ')[0]}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-200">·</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Vista clásica: filas = personas, columnas = fechas */}
      {modoVisual === 'personas' && filteredRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-xs border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 border sticky left-0 bg-gray-50 text-left font-medium text-gray-600">Trabajador</th>
                {visualFechas.map((f) => (
                  <th key={f} className="px-2 py-2 border text-center font-medium text-gray-700 min-w-[70px]">
                    <span className="block text-gray-400 font-normal">{dayLabel(f)}</span>
                    {f.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.horarioId}>
                  <td className="px-3 py-2 border sticky left-0 bg-white font-medium whitespace-nowrap">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-xs mr-1 ${colorForType(row.userType)}`}>
                      {row.userType.slice(0, 3)}
                    </span>
                    {row.userName}
                  </td>
                  {visualFechas.map((f) => {
                    const c = row.celdas[f];
                    if (c?.tipo !== 'trabaja') {
                      return (
                        <td key={f} className="px-1 py-2 border text-center text-gray-300">
                          {c?.tipo === 'libre' ? '—' : ''}
                        </td>
                      );
                    }
                    const turnos = c.turnos ?? (c.horaInicio && c.horaFin ? [{ inicio: c.horaInicio, fin: c.horaFin }] : []);
                    return (
                      <td key={f} className="px-1 py-1 border align-top">
                        <div className="flex flex-col gap-0.5">
                          {turnos.map((t, i) => (
                            <span
                              key={i}
                              className={`inline-block rounded px-1 py-0.5 text-xs font-medium ${colorForType(row.userType)}`}
                            >
                              {t.inicio}–{t.fin}
                            </span>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredRows.length === 0 && visualRows.length > 0 && (
        <p className="text-gray-500 text-sm">No hay trabajadores para el filtro seleccionado.</p>
      )}
    </div>
  );
}

export function CalendariosAdmin() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('habilitar');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [ventanas, setVentanas] = useState<VentanaAbierta[]>([]);
  const [pendientes, setPendientes] = useState<Horario[]>([]);
  const [selectedRol, setSelectedRol] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [editHorario, setEditHorario] = useState<Horario | null>(null);
  const [editDias, setEditDias] = useState<Record<string, DiaHorario>>({});
  const [visualDesde, setVisualDesde] = useState('');
  const [visualHasta, setVisualHasta] = useState('');
  const [visualRows, setVisualRows] = useState<FilaVisual[]>([]);
  const [visualFechas, setVisualFechas] = useState<string[]>([]);
  const [modoVisual, setModoVisual] = useState<ModoVisual>('cobertura');
  const [filterRolVisual, setFilterRolVisual] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const workers = users.filter((u) => WORKER_ROLES.has(u.rol));
  const workersDelRol = selectedRol ? workers.filter((u) => u.rol === selectedRol) : [];

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
    const user = workersDelRol.find((u) => u.nombre === selectedUser || u.usuario === selectedUser);
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
            <label className="text-sm">
              Rol
              <select
                className="block mt-1 w-full border rounded-lg px-3 py-2"
                value={selectedRol}
                onChange={(e) => { setSelectedRol(e.target.value); setSelectedUser(''); }}
              >
                <option value="">— Elegir rol —</option>
                <option value="Bee Zero">BeeZero ({workers.filter(u => u.rol === 'Bee Zero').length})</option>
                <option value="Ecodelivery">EcoDelivery ({workers.filter(u => u.rol === 'Ecodelivery').length})</option>
                <option value="Operador">Operador ({workers.filter(u => u.rol === 'Operador').length})</option>
              </select>
            </label>
            <label className="text-sm">
              Trabajador
              <select
                className="block mt-1 w-full border rounded-lg px-3 py-2"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                disabled={!selectedRol}
              >
                <option value="">— Seleccionar —</option>
                {workersDelRol.map((u) => (
                  <option key={u.usuario} value={u.nombre}>
                    {u.nombre}
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
        <VisualTab
          visualDesde={visualDesde}
          setVisualDesde={setVisualDesde}
          visualHasta={visualHasta}
          setVisualHasta={setVisualHasta}
          visualRows={visualRows}
          visualFechas={visualFechas}
          modoVisual={modoVisual}
          setModoVisual={setModoVisual}
          filterRolVisual={filterRolVisual}
          setFilterRolVisual={setFilterRolVisual}
          onCargar={() => void cargarVisual()}
        />
      )}
    </div>
  );
}
