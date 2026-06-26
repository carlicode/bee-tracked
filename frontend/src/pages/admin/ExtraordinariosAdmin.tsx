import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extraordinariosApi, type Extraordinario, type InscripcionExtra } from '../../services/extraordinariosApi';
import { useToast } from '../../contexts/ToastContext';

export function ExtraordinariosAdmin() {
  const toast = useToast();
  const [list, setList] = useState<Extraordinario[]>([]);
  const [selected, setSelected] = useState<Extraordinario | null>(null);
  const [inscripciones, setInscripciones] = useState<InscripcionExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [horaIni, setHoraIni] = useState('08:00');
  const [horaFin, setHoraFin] = useState('14:00');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await extraordinariosApi.getAdmin('all'));
    } catch (err) {
      toast.show(extraordinariosApi.parseError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const crear = async () => {
    if (!titulo.trim() || !fecha) {
      toast.show('Completa título y fecha', 'error');
      return;
    }
    try {
      await extraordinariosApi.crear({
        titulo: titulo.trim(),
        fecha,
        descripcion,
        horaInicioSugerida: horaIni,
        horaFinSugerida: horaFin,
      });
      toast.show('Día extraordinario creado', 'success');
      setTitulo('');
      setDescripcion('');
      await load();
    } catch (err) {
      toast.show(extraordinariosApi.parseError(err), 'error');
    }
  };

  const verInscripciones = async (extra: Extraordinario) => {
    setSelected(extra);
    try {
      setInscripciones(await extraordinariosApi.getInscripciones(extra.extraId));
    } catch (err) {
      toast.show(extraordinariosApi.parseError(err), 'error');
    }
  };

  const responder = async (ins: InscripcionExtra, accion: 'aprobar' | 'rechazar') => {
    if (!selected) return;
    try {
      await extraordinariosApi.responderInscripcion(selected.extraId, ins.userName, accion);
      toast.show(accion === 'aprobar' ? 'Inscripción aprobada' : 'Inscripción rechazada', 'success');
      await verInscripciones(selected);
    } catch (err) {
      toast.show(extraordinariosApi.parseError(err), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/dashboard" className="text-sm font-medium text-beeadmin-purple">← Volver al panel</Link>
      <div>
        <h1 className="text-2xl font-bold">Días extraordinarios</h1>
        <p className="text-gray-600 text-sm mt-1">Feriados u operaciones especiales. Los trabajadores se inscriben con horario propuesto.</p>
      </div>

      <div className="rounded-xl border p-4 grid gap-3 sm:grid-cols-2">
        <input className="border rounded-lg px-3 py-2" placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <input type="date" className="border rounded-lg px-3 py-2" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <input type="time" className="border rounded-lg px-3 py-2" value={horaIni} onChange={(e) => setHoraIni(e.target.value)} />
        <input type="time" className="border rounded-lg px-3 py-2" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
        <textarea className="border rounded-lg px-3 py-2 sm:col-span-2" placeholder="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} />
        <button type="button" onClick={() => void crear()} className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white text-sm sm:col-span-2">
          Crear día extraordinario
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : (
        <div className="space-y-3">
          {list.map((e) => (
            <div key={e.extraId} className="rounded-xl border p-4 flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-semibold">{e.titulo}</p>
                <p className="text-sm text-gray-600">{e.fecha} · {e.estado} · sugerido {e.horaInicioSugerida}–{e.horaFinSugerida}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => void verInscripciones(e)} className="px-3 py-1 rounded border text-sm">Inscripciones</button>
                {e.estado === 'abierto' && (
                  <button type="button" onClick={() => void extraordinariosApi.cerrar(e.extraId).then(load)} className="px-3 py-1 rounded bg-gray-800 text-white text-sm">
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="font-semibold">Inscripciones — {selected.titulo}</h2>
          {inscripciones.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin inscripciones.</p>
          ) : (
            inscripciones.map((ins) => (
              <div key={`${ins.userId}-${ins.extraId}`} className="flex flex-wrap justify-between gap-2 border rounded p-3">
                <div>
                  <p className="font-medium">{ins.userName}</p>
                  <p className="text-sm text-gray-600">{ins.horaInicio}–{ins.horaFin} · {ins.estado}</p>
                </div>
                {ins.estado === 'pendiente' && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void responder(ins, 'aprobar')} className="px-3 py-1 rounded bg-green-600 text-white text-sm">Aprobar</button>
                    <button type="button" onClick={() => void responder(ins, 'rechazar')} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Rechazar</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
