import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Turno } from '../../types/turno';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatters } from '../../utils/formatters';
import { turnosApi } from '../../services/turnosApi';
import { useToast } from '../../contexts/ToastContext';

/** Campos del formulario de corrección; string vacío = no cambiar ese campo */
type FormCorreccion = {
  aperturaCaja: string;
  cierreCaja: string;
  pagosQR: string;
  kilometrajeInicio: string;
  kilometrajeCierre: string;
  bateriaInicio: string;
  bateriaCierre: string;
  observaciones: string;
};

const FORM_VACIO: FormCorreccion = {
  aperturaCaja: '',
  cierreCaja: '',
  pagosQR: '',
  kilometrajeInicio: '',
  kilometrajeCierre: '',
  bateriaInicio: '',
  bateriaCierre: '',
  observaciones: '',
};

export const DetalleTurno = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [turno, setTurno] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(true);
  const [historialIndex, setHistorialIndex] = useState<number>(-1);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<FormCorreccion>(FORM_VACIO);

  useEffect(() => {
    loadTurno();
  }, [id]);

  const loadTurno = () => {
    try {
      setLoading(true);

      if (id === 'actual') {
        // Cargar turno actual
        const turnoActualData = localStorage.getItem('turno_actual');
        if (turnoActualData) {
          setTurno(JSON.parse(turnoActualData));
        }
      } else {
        // El param puede ser el ID real del turno (backend) o, para datos viejos, el índice del historial
        const turnosHistorial = JSON.parse(localStorage.getItem('turnos_historial') || '[]') as Turno[];
        const idxPorId = turnosHistorial.findIndex((t) => t?.id != null && String(t.id) === id);
        const idx = idxPorId !== -1 ? idxPorId : parseInt(id || '0');
        setHistorialIndex(idx);
        setTurno(turnosHistorial[idx] || null);
      }
    } catch (error) {
      console.error('Error cargando turno:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirEdicion = () => {
    setForm({ ...FORM_VACIO, observaciones: turno?.observaciones || '' });
    setEditando(true);
  };

  const soloDecimal = (valor: string) => {
    const raw = valor.replace(',', '.').replace(/[^0-9.]/g, '');
    const partes = raw.split('.');
    return partes.length <= 2 ? raw : partes[0] + '.' + partes.slice(1).join('');
  };

  const guardarCorreccion = async () => {
    if (!turno?.id) return;

    const cambios: Record<string, string> = {};
    if (form.aperturaCaja !== '') cambios.aperturaCaja = form.aperturaCaja;
    if (form.kilometrajeInicio !== '') cambios.kilometrajeInicio = form.kilometrajeInicio;
    if (form.bateriaInicio !== '') cambios.bateriaInicio = form.bateriaInicio;
    if (turno.turnoCerrado) {
      if (form.cierreCaja !== '') cambios.cierreCaja = form.cierreCaja;
      if (form.pagosQR !== '') cambios.pagosQR = form.pagosQR;
      if (form.kilometrajeCierre !== '') cambios.kilometrajeCierre = form.kilometrajeCierre;
      if (form.bateriaCierre !== '') cambios.bateriaCierre = form.bateriaCierre;
    }
    if (form.observaciones !== (turno.observaciones || '')) cambios.observaciones = form.observaciones;

    if (Object.keys(cambios).length === 0) {
      toast.show('No hay cambios que guardar: llena solo los campos que quieras corregir', 'info');
      return;
    }

    try {
      setGuardando(true);
      const actualizado = await turnosApi.editar(String(turno.id), {
        abejita: turno.abejita,
        cambios,
      });

      // Reflejar en el estado local y en localStorage (el detalle se lee de ahí)
      const turnoActualizado: Turno = {
        ...turno,
        aperturaCaja: cambios.aperturaCaja != null ? parseFloat(cambios.aperturaCaja) : turno.aperturaCaja,
        cierreCaja: cambios.cierreCaja != null ? parseFloat(cambios.cierreCaja) : turno.cierreCaja,
        pagosQR: cambios.pagosQR != null ? parseFloat(cambios.pagosQR) : turno.pagosQR,
        kilometraje: turno.turnoCerrado
          ? (cambios.kilometrajeCierre != null ? parseFloat(cambios.kilometrajeCierre) : turno.kilometraje)
          : (cambios.kilometrajeInicio != null ? parseFloat(cambios.kilometrajeInicio) : turno.kilometraje),
        bateria: turno.turnoCerrado
          ? (cambios.bateriaCierre != null ? parseFloat(cambios.bateriaCierre) : turno.bateria)
          : (cambios.bateriaInicio != null ? parseFloat(cambios.bateriaInicio) : turno.bateria),
        observaciones: cambios.observaciones != null ? cambios.observaciones : turno.observaciones,
        diferencia: actualizado['Diferencia (Bs)'] !== undefined && actualizado['Diferencia (Bs)'] !== ''
          ? parseFloat(actualizado['Diferencia (Bs)'])
          : turno.diferencia,
        updatedAt: new Date().toISOString(),
      };

      if (id === 'actual') {
        localStorage.setItem('turno_actual', JSON.stringify(turnoActualizado));
      } else if (historialIndex >= 0) {
        const historial = JSON.parse(localStorage.getItem('turnos_historial') || '[]') as Turno[];
        if (historial[historialIndex]) {
          historial[historialIndex] = turnoActualizado;
          localStorage.setItem('turnos_historial', JSON.stringify(historial));
        }
      }

      setTurno(turnoActualizado);
      setEditando(false);
      toast.show('Corrección guardada correctamente', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo guardar la corrección';
      toast.show(msg, 'error');
    } finally {
      setGuardando(false);
    }
  };

  // Total Final = Cierre - Apertura - Total Gastos + Pagos QR
  const calcularDiferenciaCaja = () => {
    if (!turno) return 0;
    const apertura = turno.aperturaCaja || 0;
    const cierre = turno.cierreCaja || 0;
    const totalGastos = turno.totalGastos || (turno.gastosCierre || []).reduce((acc, g) => acc + (g.monto || 0), 0);
    const pagosQR = turno.pagosQR || 0;
    return cierre - apertura - totalGastos + pagosQR;
  };


  if (loading) {
    return <LoadingSpinner />;
  }

  if (!turno) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-700 mb-4">Turno no encontrado</p>
        <button
          onClick={() => navigate('/beezero/mis-turnos')}
          className="bg-beezero-yellow text-black px-6 py-2 rounded-lg hover:bg-beezero-yellow-dark transition font-semibold"
        >
          Volver a Mis Turnos
        </button>
      </div>
    );
  }

  const diferencia = calcularDiferenciaCaja();
  const gastosCierre = turno.gastosCierre || [];
  const totalGastos = turno.totalGastos || gastosCierre.reduce((acc, gasto) => acc + (gasto.monto || 0), 0);

  return (
    <div>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/beezero/mis-turnos')}
          className="flex items-center gap-2 text-gray-600 hover:text-black font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver atrás
        </button>
      </div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-black">Detalle del Turno</h2>
        {turno.id != null && !editando && (
          <button
            type="button"
            onClick={abrirEdicion}
            className="border-2 border-black text-black px-4 py-2 rounded-lg hover:bg-gray-50 transition font-semibold text-sm whitespace-nowrap"
          >
            ✏️ Corregir datos
          </button>
        )}
      </div>

      {editando && (
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-beezero-yellow mb-6">
          <h3 className="text-lg font-bold text-black mb-1">Corregir datos del turno</h3>
          <p className="text-sm text-gray-600 mb-4">
            Llena <strong>solo</strong> los campos que quieras corregir; deja vacío lo demás.
            Las horas y ubicaciones GPS no se pueden modificar. Toda corrección queda registrada.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Apertura caja (Bs) <span className="font-normal text-gray-500">(actual: {turno.aperturaCaja})</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={form.aperturaCaja}
                onChange={(e) => setForm((p) => ({ ...p, aperturaCaja: soloDecimal(e.target.value) }))}
                placeholder="Sin cambio"
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
              />
            </div>

            {turno.turnoCerrado && (
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Cierre caja (Bs) <span className="font-normal text-gray-500">(actual: {turno.cierreCaja ?? '—'})</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.cierreCaja}
                  onChange={(e) => setForm((p) => ({ ...p, cierreCaja: soloDecimal(e.target.value) }))}
                  placeholder="Sin cambio"
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
                />
              </div>
            )}

            {turno.turnoCerrado && (
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Pagos por QR (Bs) <span className="font-normal text-gray-500">(actual: {turno.pagosQR ?? 0})</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.pagosQR}
                  onChange={(e) => setForm((p) => ({ ...p, pagosQR: soloDecimal(e.target.value) }))}
                  placeholder="Sin cambio"
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-black mb-1">Kilometraje de inicio</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.kilometrajeInicio}
                onChange={(e) => setForm((p) => ({ ...p, kilometrajeInicio: soloDecimal(e.target.value) }))}
                placeholder="Sin cambio"
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
              />
            </div>

            {turno.turnoCerrado && (
              <div>
                <label className="block text-sm font-medium text-black mb-1">Kilometraje de cierre</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.kilometrajeCierre}
                  onChange={(e) => setForm((p) => ({ ...p, kilometrajeCierre: soloDecimal(e.target.value) }))}
                  placeholder="Sin cambio"
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-black mb-1">Batería de inicio</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.bateriaInicio}
                onChange={(e) => setForm((p) => ({ ...p, bateriaInicio: soloDecimal(e.target.value) }))}
                placeholder="Sin cambio"
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
              />
            </div>

            {turno.turnoCerrado && (
              <div>
                <label className="block text-sm font-medium text-black mb-1">Batería de cierre</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.bateriaCierre}
                  onChange={(e) => setForm((p) => ({ ...p, bateriaCierre: soloDecimal(e.target.value) }))}
                  placeholder="Sin cambio"
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-black mb-1">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
                rows={2}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => setEditando(false)}
              disabled={guardando}
              className="flex-1 border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition font-semibold disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void guardarCorreccion()}
              disabled={guardando}
              className="flex-1 bg-beezero-yellow text-black px-4 py-2 rounded-lg hover:bg-beezero-yellow-dark transition font-semibold shadow-md disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar corrección'}
            </button>
          </div>
        </div>
      )}

      {/* Información General */}
      <div className="bg-beezero-yellow rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-black mb-2">
              {turno.abejita} - {turno.auto}
            </h3>
            <div className="space-y-1 text-sm text-black/70">
              <p>
                <strong>Inicio:</strong> {formatters.formatDateTimeShort(turno.createdAt)}
                {turno.horaInicio && (
                  <span className="ml-2 font-bold text-black">({turno.horaInicio})</span>
                )}
              </p>
              {turno.turnoCerrado && (
                <p>
                  <strong>Cierre:</strong> {formatters.formatDateTimeShort(turno.updatedAt)}
                  {turno.horaCierre && (
                    <span className="ml-2 font-bold text-black">({turno.horaCierre})</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-xs font-semibold ${
            turno.turnoCerrado 
              ? 'bg-green-100 text-green-800' 
              : 'bg-black text-white'
          }`}>
            {turno.turnoCerrado ? 'CERRADO' : 'EN CURSO'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información de Inicio */}
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-beezero-yellow">
          <h3 className="text-lg font-bold text-black mb-4">📋 Información de Inicio</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Abejita</p>
              <p className="font-semibold text-black">{turno.abejita}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Auto (Placa)</p>
              <p className="font-semibold text-black text-lg">{turno.auto}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Hora de Inicio</p>
              <p className="font-bold text-black text-xl">
                {turno.horaInicio || 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Apertura de Caja</p>
              <p className="font-bold text-black text-2xl">Bs {turno.aperturaCaja}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Daños al Auto</p>
              <p className="font-medium text-black">{turno.danosAuto}</p>
            </div>

            {turno.ubicacionInicio && (
              <div>
                <p className="text-sm text-gray-600">📍 Ubicación de Inicio</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatters.formatDateTimeShort(turno.ubicacionInicio.timestamp)}
                </p>
              </div>
            )}

            {/* Fotos ocultas temporalmente (S3 sin acceso público) */}
            {/* {turno.fotoPantalla && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Foto del tablero</p>
                <img
                  src={turno.fotoPantalla}
                  alt="Foto del tablero inicio"
                  className="w-full rounded-lg shadow-md"
                />
              </div>
            )}

            {turno.fotoExterior && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Foto del Exterior (Inicio)</p>
                <img
                  src={turno.fotoExterior}
                  alt="Foto exterior inicio"
                  className="w-full rounded-lg shadow-md"
                />
              </div>
            )} */}
          </div>
        </div>

        {/* Información de Cierre */}
        {turno.turnoCerrado ? (
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-beezero-yellow">
            <h3 className="text-lg font-bold text-black mb-4">✅ Información de Cierre</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Hora de Cierre</p>
                <p className="font-bold text-black text-xl">
                  {turno.horaCierre || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Cierre de Caja</p>
                <p className="font-bold text-black text-2xl">Bs {turno.cierreCaja}</p>
              </div>

              {turno.pagosQR != null && turno.pagosQR > 0 && (
                <div>
                  <p className="text-sm text-gray-600">QR</p>
                  <p className="font-semibold text-black text-xl">Bs {turno.pagosQR}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Apertura:</span>
                  <span className="font-semibold">Bs {turno.aperturaCaja}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Cierre:</span>
                  <span className="font-semibold">Bs {turno.cierreCaja}</span>
                </div>
                {turno.pagosQR != null && turno.pagosQR > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700">Pagos QR:</span>
                    <span className="font-semibold text-green-600">+ Bs {turno.pagosQR.toFixed(2)}</span>
                  </div>
                )}
                {totalGastos > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700">Total Gastos:</span>
                    <span className="font-semibold text-red-600">- Bs {totalGastos.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-black">Total Final:</span>
                  <span className={`font-bold text-lg ${diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Bs {diferencia.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Daños al Auto</p>
                <p className="font-medium text-black">{turno.danosAuto}</p>
              </div>

              {gastosCierre.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Gastos adicionales</p>
                  <div className="space-y-2">
                    {gastosCierre.map((gasto, idx) => (
                      <div key={`${gasto.tipo}-${idx}`} className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-black">{gasto.tipo}</p>
                          {gasto.descripcion && (
                            <p className="text-xs text-gray-500">{gasto.descripcion}</p>
                          )}
                        </div>
                        <p className="font-semibold text-black whitespace-nowrap">Bs {(gasto.monto || 0).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-3 pt-2 flex justify-between">
                    <span className="text-sm font-bold text-black">Total gastos</span>
                    <span className="text-sm font-bold text-black">Bs {totalGastos.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {turno.observaciones && (
                <div>
                  <p className="text-sm text-gray-600">Información extra</p>
                  <p className="font-medium text-black whitespace-pre-wrap">{turno.observaciones}</p>
                </div>
              )}

              {turno.ubicacionFin && (
                <div>
                  <p className="text-sm text-gray-600">📍 Ubicación de Cierre</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatters.formatDateTimeShort(turno.ubicacionFin.timestamp)}
                  </p>
                </div>
              )}

              {/* Fotos ocultas temporalmente (S3 sin acceso público) */}
              {/* {turno.fotoPantalla && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Foto del tablero (Cierre)</p>
                  <img
                    src={turno.fotoPantalla}
                    alt="Foto del tablero cierre"
                    className="w-full rounded-lg shadow-md"
                  />
                </div>
              )}

              {turno.fotoExterior && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Foto del Exterior (Cierre)</p>
                  <img
                    src={turno.fotoExterior}
                    alt="Foto exterior cierre"
                    className="w-full rounded-lg shadow-md"
                  />
                </div>
              )} */}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Turno aún no cerrado</p>
              <button
                onClick={() => navigate('/beezero/cerrar-turno')}
                className="bg-beezero-yellow text-black px-6 py-2 rounded-lg hover:bg-beezero-yellow-dark transition font-semibold"
              >
                Cerrar Turno
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resumen de Carreras */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6 border-2 border-beezero-yellow">
        <h3 className="text-lg font-bold text-black mb-4">🚗 Resumen de Carreras</h3>
        <p className="text-gray-600 text-sm mb-4">
          Las carreras registradas durante este turno aparecerán aquí.
        </p>
        <Link
          to="/beezero/mis-carreras"
          className="text-beezero-yellow hover:text-beezero-yellow-dark font-semibold"
        >
          Ver todas las carreras →
        </Link>
      </div>
    </div>
  );
};

