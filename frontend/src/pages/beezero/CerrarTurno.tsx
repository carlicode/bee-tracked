import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../services/auth';
import { turnosApi } from '../../services/turnosApi';
import { formatters } from '../../utils/formatters';
import { fileToCompressedBase64 } from '../../utils/image';
import type { Turno } from '../../types/turno';

type GastoCierreInput = {
  id: string;
  tipo: string;
  monto: number | undefined;
  montoStr: string;
  descripcion: string;
  foto: string;
};

const TIPOS_GASTO = [
  'QR',
  'Sueldo',
  'Peaje/Estacionamiento',
  'Carga de auto',
  'Apps',
  'Reparaciones/Mantenimiento',
  'BZ/MF',
  'Lavado',
  'Alquiler del auto',
  'CXC driver/cliente/compras',
  'Falta',
  'Demas',
  'Debe cliente',
  'Electrolinera',
  'Parchado',
  'Inflado/Air',
  'Otro',
] as const;

const createEmptyGasto = (): GastoCierreInput => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  tipo: '',
  monto: undefined,
  montoStr: '',
  descripcion: '',
  foto: '',
});

export const CerrarTurno = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [turnoInicio, setTurnoInicio] = useState<Partial<Turno> | null>(null);

  const [deseaRegistrarDano, setDeseaRegistrarDano] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<Partial<Turno> & { cierreCajaStr?: string }>({
    cierreCaja: undefined,
    qr: 0,
    cierreCajaStr: '',
    kilometraje: undefined,
    bateria: undefined,
    danosAuto: 'ninguno',
    fotoPantalla: '',
    fotoExterior: '',
    observaciones: '',
  });
  const [gastosCierre, setGastosCierre] = useState<GastoCierreInput[]>([]);

  useEffect(() => {
    const cargarTurno = async () => {
      const aplicarTurno = (turno: Partial<Turno>) => {
        setTurnoInicio(turno);
        setGastosCierre(
          (turno.gastosCierre || []).map((gasto) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            tipo: gasto.tipo || '',
            monto: gasto.monto,
            montoStr: gasto.monto != null && gasto.monto > 0 ? String(gasto.monto) : '',
            descripcion: gasto.descripcion || '',
            foto: gasto.foto || '',
          }))
        );
        setFormData((prev) => ({
          ...prev,
          abejita: turno.abejita,
          auto: turno.auto,
          aperturaCaja: turno.aperturaCaja,
          kilometraje: turno.kilometraje,
          bateria: turno.bateria,
          danosAuto: turno.danosAuto || 'ninguno',
          observaciones: turno.observaciones || '',
        }));
      };

      // Siempre consultar backend primero cuando está habilitado (fuente de verdad)
      if (turnosApi.isEnabled() && user?.driverName) {
        const turno = await turnosApi.getTurnoActivo(user.driverName);
        if (turno) {
          aplicarTurno(turno);
          return;
        }
      }

      // Fallback: localStorage (modo demo o backend no disponible)
      const turnoGuardado = localStorage.getItem('turno_actual');
      if (turnoGuardado) {
        try {
          const turno = JSON.parse(turnoGuardado) as Partial<Turno>;
          if (turno?.turnoIniciado && !turno?.turnoCerrado) {
            aplicarTurno(turno);
          }
        } catch {
          // JSON inválido
        }
      }
    };
    cargarTurno();
  }, [user?.driverName]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.show('La geolocalización no está disponible en tu dispositivo', 'error');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        toast.show('Error al obtener la ubicación. Asegúrate de permitir el acceso a la ubicación.', 'error');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handlePhotoUpload = (field: 'fotoPantalla' | 'fotoExterior') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToCompressedBase64(file);
      setFormData((prev) => ({
        ...prev,
        [field]: dataUrl,
      }));
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Error al procesar la imagen', 'error');
    }
  };

  // Diferencia = Cierre - Apertura - Total Gastos
  const calcularDiferencia = () => {
    const apertura = formData.aperturaCaja || 0;
    const cierre = formData.cierreCaja ?? (parseFloat((formData as { cierreCajaStr?: string }).cierreCajaStr ?? '') || 0);
    return cierre - apertura - totalGastos;
  };

  const totalGastos = gastosCierre.reduce((acc, gasto) => acc + (gasto.monto || 0), 0);

  const addGasto = () => {
    setGastosCierre((prev) => [...prev, createEmptyGasto()]);
  };

  const removeGasto = (id: string) => {
    setGastosCierre((prev) => prev.filter((gasto) => gasto.id !== id));
  };

  const updateGasto = (id: string, patch: Partial<GastoCierreInput>) => {
    setGastosCierre((prev) =>
      prev.map((gasto) => {
        if (gasto.id !== id) return gasto;
        return { ...gasto, ...patch };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cierreNum = formData.cierreCaja ?? parseFloat((formData as { cierreCajaStr?: string }).cierreCajaStr ?? '');
    if (cierreNum == null || isNaN(cierreNum) || cierreNum <= 0) {
      toast.show('Por favor ingresa el cierre de caja', 'info');
      return;
    }

    if (deseaRegistrarDano === null) {
      toast.show('Por favor indica si desea registrar algún daño al auto (Sí o No)', 'info');
      return;
    }

    if (!location) {
      toast.show('Por favor obtén tu ubicación antes de cerrar el turno', 'info');
      return;
    }

    const gastosPayload = gastosCierre.map((gasto) => ({
      tipo: gasto.tipo.trim(),
      monto: gasto.monto ?? parseFloat(gasto.montoStr || ''),
      descripcion: gasto.descripcion.trim(),
      foto: gasto.foto || undefined,
    }));
    const gastosInvalidos = gastosPayload.some(
      (gasto) => !gasto.tipo || !Number.isFinite(gasto.monto) || Number(gasto.monto) <= 0
    );
    if (gastosInvalidos) {
      toast.show('Cada gasto debe tener tipo y monto mayor a 0', 'info');
      return;
    }

    try {
      setLoading(true);

      const ahora = new Date();
      const horaCierre = formatters.timeToHHmm(ahora);
      const danos = deseaRegistrarDano ? formData.danosAuto || 'ninguno' : 'ninguno';
      const fotoExt = deseaRegistrarDano ? formData.fotoExterior : '';

      const cierreCajaNum =
        formData.cierreCaja ?? (parseFloat((formData as { cierreCajaStr?: string }).cierreCajaStr ?? '') || 0);

      let turnoId = turnoInicio?.id;

      // Con backend: cerrar primero en el servidor; si falla, no limpiar estado local
      // (el flujo anterior borraba turno_actual y mostraba éxito aunque el Sheet siguiera INICIADO).
      if (turnosApi.isEnabled()) {
        if (!turnoId && user?.driverName) {
          const fresh = await turnosApi.getTurnoActivo(user.driverName);
          turnoId = fresh?.id;
        }
        if (!turnoId) {
          toast.show(
            'No se encontró el turno activo en el servidor. Recarga la página; si el problema continúa, contacta soporte.',
            'error'
          );
          return;
        }
        try {
          await turnosApi.cerrar(turnoId, {
            cierreCaja: cierreCajaNum,
            gastos: gastosPayload,
            kilometraje: formData.kilometraje,
            bateria: formData.bateria,
            danosAuto: danos,
            fotoPantalla: formData.fotoPantalla,
            fotoExterior: fotoExt,
            horaCierre,
            ubicacionFin: { lat: location.lat, lng: location.lng },
            observaciones: formData.observaciones || '',
          });
        } catch (backendError) {
          console.error('Error al cerrar turno en el servidor:', backendError);
          const msg =
            backendError instanceof Error
              ? backendError.message
              : 'No se pudo cerrar el turno. Revisa tu conexión e intenta de nuevo.';
          toast.show(msg, 'error');
          return;
        }
      }

      const turnoCompleto = {
        ...turnoInicio,
        ...formData,
        id: turnoId ?? turnoInicio?.id,
        danosAuto: danos,
        fotoExterior: fotoExt,
        observaciones: formData.observaciones || '',
        gastosCierre: gastosPayload,
        totalGastos,
        horaCierre,
        ubicacionFin: {
          ...location,
          timestamp: ahora.toISOString(),
        },
        turnoCerrado: true,
        updatedAt: ahora.toISOString(),
      };

      const toSaveHistorial = { ...turnoCompleto };
      delete (toSaveHistorial as Record<string, unknown>).fotoPantalla;
      delete (toSaveHistorial as Record<string, unknown>).fotoExterior;
      const turnosHistorial = JSON.parse(localStorage.getItem('turnos_historial') || '[]');
      turnosHistorial.push(toSaveHistorial);
      localStorage.setItem('turnos_historial', JSON.stringify(turnosHistorial));
      localStorage.removeItem('turno_actual');

      toast.show('Turno cerrado exitosamente', 'success');
      navigate('/beezero/dashboard');
    } catch (error) {
      console.error('Error cerrando turno:', error);
      const msg = error instanceof Error ? error.message : 'Error al cerrar el turno. Intenta nuevamente.';
      toast.show(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!turnoInicio) {
    return (
      <div>
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate('/beezero/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-black font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver atrás
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-700 mb-4">No hay un turno iniciado para cerrar</p>
        <button
          onClick={() => navigate('/beezero/iniciar-turno')}
          className="bg-beezero-yellow text-black px-6 py-2 rounded-lg hover:bg-beezero-yellow-dark transition font-semibold"
        >
          Ir a Iniciar Turno
        </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/beezero/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-black font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver atrás
        </button>
      </div>
      <h2 className="text-2xl font-bold text-black mb-6">Cerrar Turno</h2>

      {/* Resumen del Turno */}
      <div className="bg-beezero-yellow rounded-lg shadow-md p-6 mb-6">
        <h3 className="font-bold text-black mb-4">Resumen del Turno</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-black/70">Abejita:</p>
            <p className="font-semibold text-black">{formData.abejita}</p>
          </div>
          <div>
            <p className="text-black/70">Auto:</p>
            <p className="font-semibold text-black">{formData.auto}</p>
          </div>
          <div>
            <p className="text-black/70">Apertura Caja:</p>
            <p className="font-semibold text-black">Bs {formData.aperturaCaja}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Cierre de Caja - texto para evitar cero adelante */}
        <div>
          <label htmlFor="cierreCaja" className="block text-sm font-medium text-black mb-1">
            Cierre de Caja (Bs) *
          </label>
          <input
            type="text"
            inputMode="decimal"
            id="cierreCaja"
            required
            value={(formData as { cierreCajaStr?: string }).cierreCajaStr ?? (formData.cierreCaja != null && formData.cierreCaja > 0 ? String(formData.cierreCaja) : '')}
            onChange={(e) => {
              const raw = e.target.value.replace(',', '.');
              const soloNumeros = raw.replace(/[^0-9.]/g, '');
              const partes = soloNumeros.split('.');
              const valida = partes.length <= 2 && (partes[1]?.length ?? 0) <= 2;
              const str = valida ? soloNumeros : ((formData as { cierreCajaStr?: string }).cierreCajaStr ?? '');
              const num = parseFloat(str);
              setFormData((prev) => ({ ...prev, cierreCajaStr: str, cierreCaja: str === '' ? undefined : (isNaN(num) ? undefined : Math.max(0, num)) }));
            }}
            placeholder="Ej: 164"
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
          />
        </div>

        <div className="border-2 border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-black">Gastos adicionales (opcional)</h4>
            <button
              type="button"
              onClick={addGasto}
              className="bg-black text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition"
            >
              + Agregar gasto
            </button>
          </div>
          {gastosCierre.length === 0 ? (
            <p className="text-sm text-gray-500">No agregaste gastos aún.</p>
          ) : (
            <div className="space-y-3">
              {gastosCierre.map((gasto) => (
                <div key={gasto.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start bg-gray-50 p-3 rounded-lg">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={gasto.tipo}
                      onChange={(e) => updateGasto(gasto.id, { tipo: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
                    >
                      <option value="">Selecciona tipo</option>
                      {TIPOS_GASTO.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Monto (Bs) *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={gasto.montoStr}
                      onChange={(e) => {
                        const raw = e.target.value.replace(',', '.');
                        const soloNumeros = raw.replace(/[^0-9.]/g, '');
                        const partes = soloNumeros.split('.');
                        const valida = partes.length <= 2 && (partes[1]?.length ?? 0) <= 2;
                        const str = valida ? soloNumeros : gasto.montoStr;
                        const num = parseFloat(str);
                        updateGasto(gasto.id, {
                          montoStr: str,
                          monto: str === '' || isNaN(num) ? undefined : Math.max(0, num),
                        });
                      }}
                      placeholder="Ej: 25"
                      className="w-full border-2 border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                    <input
                      type="text"
                      value={gasto.descripcion}
                      onChange={(e) => updateGasto(gasto.id, { descripcion: e.target.value })}
                      placeholder="Opcional"
                      className="w-full border-2 border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
                    />
                  </div>
                  <div className="md:col-span-11">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Foto del gasto</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const dataUrl = await fileToCompressedBase64(file);
                          updateGasto(gasto.id, { foto: dataUrl });
                        } catch (err) {
                          toast.show(err instanceof Error ? err.message : 'Error al procesar la imagen', 'error');
                        }
                      }}
                      className="w-full border-2 border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow text-sm"
                    />
                    {gasto.foto && (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={gasto.foto} alt="Foto gasto" className="w-16 h-16 object-cover rounded-lg shadow" />
                        <button
                          type="button"
                          onClick={() => updateGasto(gasto.id, { foto: '' })}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Quitar foto
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-1 flex md:justify-end">
                    <button
                      type="button"
                      onClick={() => removeGasto(gasto.id)}
                      className="mt-0 md:mt-1 text-red-600 hover:text-red-700 text-sm font-semibold"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalGastos > 0 && (
            <div className="flex justify-end">
              <p className="text-sm font-semibold text-black">Total gastos: Bs {totalGastos.toFixed(2)}</p>
            </div>
          )}
        </div>

        {/* Resumen de Caja */}
        {(formData.cierreCaja ?? parseFloat((formData as { cierreCajaStr?: string }).cierreCajaStr ?? '')) > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Cierre:</span>
              <span className="font-semibold">Bs {formData.cierreCaja ?? parseFloat((formData as { cierreCajaStr?: string }).cierreCajaStr ?? '')}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Apertura:</span>
              <span className="font-semibold text-red-600">- Bs {formData.aperturaCaja}</span>
            </div>
            {totalGastos > 0 && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">Total Gastos:</span>
                <span className="font-semibold text-red-600">- Bs {totalGastos.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2 flex justify-between">
              <span className="font-bold text-black">Diferencia:</span>
              <span className={`font-bold ${calcularDiferencia() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Bs {calcularDiferencia().toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Auto */}
        <div>
          <label htmlFor="auto" className="block text-sm font-medium text-black mb-1">
            Auto (Placa) *
          </label>
          <input
            type="text"
            id="auto"
            required
            value={formData.auto}
            readOnly
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
          />
        </div>

        {/* Ubicación (sin mostrar coordenadas) */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Ubicación *
          </label>
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={locationLoading}
            className="w-full bg-beezero-yellow text-black px-4 py-3 rounded-lg hover:bg-beezero-yellow-dark transition font-semibold disabled:opacity-50 shadow-md"
          >
            {locationLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                Cargando
              </span>
            ) : location ? (
              '✓ Información obtenida'
            ) : (
              'Obtener información'
            )}
          </button>
        </div>

        {/* Kilometraje - texto libre */}
        <div>
          <label htmlFor="kilometraje" className="block text-sm font-medium text-black mb-1">
            Kilometraje
          </label>
          <input
            type="text"
            id="kilometraje"
            value={formData.kilometraje != null ? String(formData.kilometraje) : ''}
            onChange={(e) => {
              const str = e.target.value;
              const num = parseFloat(str);
              setFormData((prev) => ({
                ...prev,
                kilometraje: str === '' ? undefined : (isNaN(num) ? undefined : num),
              }));
            }}
            placeholder="Km"
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
          />
        </div>

        {/* Batería Cierre - después de kilometraje */}
        <div>
          <label htmlFor="bateria" className="block text-sm font-medium text-black mb-1">
            Batería Cierre
          </label>
          <input
            type="text"
            id="bateria"
            inputMode="numeric"
            value={formData.bateria != null ? String(formData.bateria) : ''}
            onChange={(e) => {
              const str = e.target.value;
              const num = parseFloat(str);
              setFormData((prev) => ({
                ...prev,
                bateria: str === '' ? undefined : (isNaN(num) ? undefined : num),
              }));
            }}
            placeholder="Ej: 85 (% o mV)"
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
          />
        </div>

        {/* Foto del tablero */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Foto del tablero *
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload('fotoPantalla')}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
          />
          {formData.fotoPantalla && (
            <img
              src={formData.fotoPantalla}
              alt="Foto del tablero"
              className="mt-2 w-full max-w-xs rounded-lg shadow-md"
            />
          )}
        </div>

        {/* ¿Desea registrar algún daño al auto? */}
        <div>
          <p className="block text-sm font-medium text-black mb-2">
            ¿Desea registrar algún daño al auto? *
          </p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setDeseaRegistrarDano(true)}
              className={`flex-1 px-4 py-3 rounded-lg font-medium border-2 transition ${
                deseaRegistrarDano === true
                  ? 'bg-beezero-yellow border-beezero-yellow text-black'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => setDeseaRegistrarDano(false)}
              className={`flex-1 px-4 py-3 rounded-lg font-medium border-2 transition ${
                deseaRegistrarDano === false
                  ? 'bg-beezero-yellow border-beezero-yellow text-black'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              No
            </button>
          </div>
        </div>

        {deseaRegistrarDano === true && (
          <>
            {/* Daños al Auto */}
            <div>
              <label htmlFor="danosAuto" className="block text-sm font-medium text-black mb-1">
                Daños al Auto
              </label>
              <textarea
                id="danosAuto"
                value={formData.danosAuto}
                onChange={(e) => setFormData((prev) => ({ ...prev, danosAuto: e.target.value }))}
                rows={3}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
                placeholder="Describe los daños o escribe 'ninguno'"
              />
            </div>

            {/* Foto del Exterior */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Foto del Exterior (en caso de golpes o daños)
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload('fotoExterior')}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
              />
              {formData.fotoExterior && (
                <img
                  src={formData.fotoExterior}
                  alt="Foto exterior"
                  className="mt-2 w-full max-w-xs rounded-lg shadow-md"
                />
              )}
            </div>
          </>
        )}

        {/* Información extra (al cerrar turno) */}
        <div>
          <label htmlFor="observaciones" className="block text-sm font-medium text-black mb-1">
            Información extra
          </label>
          <textarea
            id="observaciones"
            value={formData.observaciones || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, observaciones: e.target.value }))}
            rows={3}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
            placeholder="Observaciones o información adicional al cerrar el turno (opcional)"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/beezero/dashboard')}
            className="flex-1 border-2 border-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !location}
            className="flex-1 bg-beezero-yellow text-black px-4 py-2 rounded-lg hover:bg-beezero-yellow-dark transition disabled:opacity-50 font-semibold shadow-md"
          >
            {loading ? 'Cerrando...' : 'Cerrar Turno'}
          </button>
        </div>
      </form>
    </div>
  );
};

