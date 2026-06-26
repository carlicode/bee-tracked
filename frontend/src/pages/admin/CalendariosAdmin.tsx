import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  calendariosApi,
  DIAS_SEMANA,
  type CalendarioSemana,
  type DiaCalendario,
  type PropuestaCalendario,
} from '../../services/calendariosApi';
import { useToast } from '../../contexts/ToastContext';

type RowDraft = {
  userId: string;
  userName: string;
  userType: string;
  dias: Record<string, DiaCalendario>;
};

function emptyDias(fechaInicio: string): Record<string, DiaCalendario> {
  const start = new Date(fechaInicio + 'T12:00:00');
  const out: Record<string, DiaCalendario> = {};
  DIAS_SEMANA.forEach((nombre, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    out[nombre] = {
      fecha: d.toISOString().slice(0, 10),
      trabaja: false,
      horaInicio: '08:00',
      horaFin: '17:00',
      nota: '',
    };
  });
  return out;
}

export function CalendariosAdmin() {
  const toast = useToast();
  const [semana, setSemana] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [userType, setUserType] = useState('all');
  const [calendarios, setCalendarios] = useState<CalendarioSemana[]>([]);
  const [propuestas, setPropuestas] = useState<PropuestaCalendario[]>([]);
  const [draft, setDraft] = useState<RowDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadMeta = useCallback(async () => {
    const meta = await calendariosApi.getSemanaActual();
    setSemana(meta.semana);
    setFechaInicio(meta.fechaInicioSemana);
  }, []);

  const load = useCallback(async () => {
    if (!semana) return;
    setLoading(true);
    try {
      const [cals, props] = await Promise.all([
        calendariosApi.getAdminSemana(semana, userType),
        calendariosApi.getPropuestasPendientes(),
      ]);
      setCalendarios(cals);
      setPropuestas(props);
    } catch (err) {
      toast.show(calendariosApi.parseError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [semana, userType, toast]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void load();
  }, [load]);

  const addRow = () => {
    setDraft({
      userId: '',
      userName: '',
      userType: 'ecodelivery',
      dias: emptyDias(fechaInicio),
    });
  };

  const saveDraft = async () => {
    if (!draft?.userName.trim()) {
      toast.show('Indica el nombre del trabajador', 'error');
      return;
    }
    setSaving(true);
    try {
      await calendariosApi.saveAdminSemana({
        semana,
        fechaInicioSemana: fechaInicio,
        calendarios: [{
          userId: draft.userId || draft.userName.toLowerCase().replace(/\s+/g, '.'),
          userName: draft.userName.trim(),
          userType: draft.userType,
          dias: draft.dias,
        }],
      });
      toast.show('Calendario guardado', 'success');
      setDraft(null);
      await load();
    } catch (err) {
      toast.show(calendariosApi.parseError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const responder = async (p: PropuestaCalendario, accion: 'aprobar' | 'rechazar') => {
    try {
      await calendariosApi.responderPropuesta(p.propuestaId, p.userName, accion);
      toast.show(accion === 'aprobar' ? 'Propuesta aprobada' : 'Propuesta rechazada', 'success');
      await load();
    } catch (err) {
      toast.show(calendariosApi.parseError(err), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/dashboard" className="text-sm font-medium text-beeadmin-purple hover:text-beeadmin-purple-dark">
        ← Volver al panel
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendarios semanales</h1>
        <p className="text-gray-600 text-sm mt-1">Publica horarios semana por semana para cada trabajador.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          Semana
          <input
            className="block mt-1 border rounded-lg px-3 py-2"
            value={semana}
            onChange={(e) => setSemana(e.target.value)}
            placeholder="2026-W26"
          />
        </label>
        <label className="text-sm">
          Inicio (lunes)
          <input
            type="date"
            className="block mt-1 border rounded-lg px-3 py-2"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Tipo
          <select className="block mt-1 border rounded-lg px-3 py-2" value={userType} onChange={(e) => setUserType(e.target.value)}>
            <option value="all">Todos</option>
            <option value="beezero">BeeZero</option>
            <option value="ecodelivery">EcoDelivery</option>
            <option value="operador">Operador</option>
          </select>
        </label>
        <button type="button" onClick={() => void load()} className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white text-sm">
          Actualizar
        </button>
        <button type="button" onClick={addRow} className="px-4 py-2 rounded-lg border border-beeadmin-purple text-beeadmin-purple text-sm">
          + Agregar trabajador
        </button>
      </div>

      {draft && (
        <div className="rounded-xl border p-4 space-y-3 bg-violet-50">
          <h2 className="font-semibold">Nuevo calendario</h2>
          <div className="flex flex-wrap gap-3">
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Nombre (ej. Leonardo Alarcon)"
              value={draft.userName}
              onChange={(e) => setDraft({ ...draft, userName: e.target.value })}
            />
            <select
              className="border rounded-lg px-3 py-2"
              value={draft.userType}
              onChange={(e) => setDraft({ ...draft, userType: e.target.value })}
            >
              <option value="beezero">beezero</option>
              <option value="ecodelivery">ecodelivery</option>
              <option value="operador">operador</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border bg-white">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2 border">Día</th>
                  <th className="p-2 border">Trabaja</th>
                  <th className="p-2 border">Inicio</th>
                  <th className="p-2 border">Fin</th>
                </tr>
              </thead>
              <tbody>
                {DIAS_SEMANA.map((d) => (
                  <tr key={d}>
                    <td className="p-2 border capitalize">{d}</td>
                    <td className="p-2 border text-center">
                      <input
                        type="checkbox"
                        checked={draft.dias[d]?.trabaja}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            dias: { ...draft.dias, [d]: { ...draft.dias[d], trabaja: e.target.checked } },
                          })
                        }
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        type="time"
                        className="border rounded px-2 py-1"
                        value={draft.dias[d]?.horaInicio || ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            dias: { ...draft.dias, [d]: { ...draft.dias[d], horaInicio: e.target.value } },
                          })
                        }
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        type="time"
                        className="border rounded px-2 py-1"
                        value={draft.dias[d]?.horaFin || ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            dias: { ...draft.dias, [d]: { ...draft.dias[d], horaFin: e.target.value } },
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={() => void saveDraft()} className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white text-sm disabled:opacity-50">
              Guardar
            </button>
            <button type="button" onClick={() => setDraft(null)} className="px-4 py-2 rounded-lg border text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {propuestas.length > 0 && (
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="font-semibold">Propuestas pendientes ({propuestas.length})</h2>
          {propuestas.map((p) => (
            <div key={p.propuestaId} className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-3">
              <div>
                <p className="font-medium">{p.userName}</p>
                <p className="text-sm text-gray-600">Semana {p.semana} · {p.userType}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => void responder(p, 'aprobar')} className="px-3 py-1 rounded bg-green-600 text-white text-sm">Aprobar</button>
                <button type="button" onClick={() => void responder(p, 'rechazar')} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : calendarios.length === 0 ? (
        <p className="text-gray-500">No hay calendarios publicados para esta semana.</p>
      ) : (
        <div className="space-y-4">
          {calendarios.map((c) => (
            <div key={`${c.userId}-${c.semana}`} className="rounded-xl border p-4">
              <p className="font-semibold">{c.userName} <span className="text-sm text-gray-500">({c.userType})</span></p>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
                {DIAS_SEMANA.map((d) => {
                  const dia = c.dias[d];
                  if (!dia) return null;
                  return (
                    <div key={d} className={`rounded p-2 border ${dia.trabaja ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <p className="font-medium capitalize">{d.slice(0, 3)}</p>
                      {dia.trabaja ? (
                        <p>{dia.horaInicio} – {dia.horaFin}</p>
                      ) : (
                        <p className="text-gray-500">Libre</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
