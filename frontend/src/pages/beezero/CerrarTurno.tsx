import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { turnosApi } from '../../services/turnosApi';
import { formatters } from '../../utils/formatters';
import type { Turno } from '../../types/turno';

export const CerrarTurno = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [turnoInicio, setTurnoInicio] = useState<Partial<Turno> | null>(null);

  const [deseaRegistrarDano, setDeseaRegistrarDano] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<Partial<Turno> & { cierreCajaStr?: string; qrStr?: string }>({
    cierreCaja: undefined,
    qr: undefined,
    cierreCajaStr: '',
    qrStr: '',
    kilometraje: undefined,
    danosAuto: 'ninguno',
    fotoPantalla: '',
    fotoExterior: '',
    observaciones: '',
  });

  useEffect(() => {
    // Cargar datos del turno iniciado
    const turnoGuardado = localStorage.getItem('turno_actual');
    if (turnoGuardado) {
      const turno = JSON.parse(turnoGuardado);
      setTurnoInicio(turno);
      setFormData((prev) => ({
        ...prev,
        abejita: turno.abejita,
        auto: turno.auto,
        aperturaCaja: turno.aperturaCaja,
        kilometraje: turno.kilometraje,
        danosAuto: turno.danosAuto || 'ninguno',
      }));
    }
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está disponible en tu dispositivo');
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
        alert('Error al obtener la ubicación. Asegúrate de permitir el acceso a la ubicación.');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handlePhotoUpload = (field: 'fotoPantalla' | 'fotoExterior') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy grande. Máximo 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        [field]: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const calcularDiferencia = () => {
    const apertura = formData.aperturaCaja || 0;
    const cierre = formData.cierreCaja ?? (parseFloat((formData as { cierreCajaStr?: string }).cierreCajaStr ?? '') || 0);
    const qr = formData.qr ?? (parseFloat((formData as { qrStr?: string }).qrStr ?? '') || 0);
    return apertura + qr + cierre;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cierreNum = formData.cierreCaja ?? parseFloat((formData as { cierreCajaStr?: string }).cierreCajaStr ?? '');
    if (cierreNum == null || isNaN(cierreNum) || cierreNum <= 0) {
      alert('Por favor ingresa el cierre de caja');
      return;
    }

    if (deseaRegistrarDano === null) {
      alert('Por favor indica si desea registrar algún daño al auto (Sí o No)');
      return;
    }

    if (!location) {
      alert('Por favor obtén tu ubicación antes de cerrar el turno');
      return;
    }

    try {
      setLoading(true);

      const ahora = new Date();
      const horaCierre = formatters.timeToHHmm(ahora);
      const danos = deseaRegistrarDano ? formData.danosAuto || 'ninguno' : 'ninguno';
      const fotoExt = deseaRegistrarDano ? formData.fotoExterior : '';

      const turnoCompleto = {
        ...turnoInicio,
        ...formData,
        danosAuto: danos,
        fotoExterior: fotoExt,
        observaciones: formData.observaciones || '',
        horaCierre,
        ubicacionFin: {
          ...location,
          timestamp: ahora.toISOString(),
        },
        turnoCerrado: true,
        updatedAt: ahora.toISOString(),
      };

      if (turnosApi.isEnabled() && turnoInicio?.id) {
        await turnosApi.cerrar(turnoInicio.id, {
          cierreCaja: formData.cierreCaja ?? (parseFloat((formData as { cierreCajaStr?: string }).cierreCajaStr ?? '') || 0),
          qr: formData.qr ?? (parseFloat((formData as { qrStr?: string }).qrStr ?? '') || 0),
          kilometraje: formData.kilometraje,
          danosAuto: danos,
          fotoPantalla: formData.fotoPantalla,
          fotoExterior: fotoExt,
          horaCierre,
          ubicacionFin: { lat: location.lat, lng: location.lng },
          observaciones: formData.observaciones || '',
        });
      }

      const turnosHistorial = JSON.parse(localStorage.getItem('turnos_historial') || '[]');
      turnosHistorial.push(turnoCompleto);
      localStorage.setItem('turnos_historial', JSON.stringify(turnosHistorial));
      localStorage.removeItem('turno_actual');

      alert('Turno cerrado exitosamente');
      navigate('/beezero/dashboard');
    } catch (error) {
      console.error('Error cerrando turno:', error);
      const msg = error instanceof Error ? error.message : 'Error al cerrar el turno. Intenta nuevamente.';
      alert(msg);
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

        {/* QR - texto para evitar cero adelante */}
        <div>
          <label htmlFor="qr" className="block text-sm font-medium text-black mb-1">
            QR (Bs)
          </label>
          <input
            type="text"
            inputMode="decimal"
            id="qr"
            value={(formData as { qrStr?: string }).qrStr ?? (formData.qr != null && formData.qr > 0 ? String(formData.qr) : '')}
            onChange={(e) => {
              const raw = e.target.value.replace(',', '.');
              const soloNumeros = raw.replace(/[^0-9.]/g, '');
              const partes = soloNumeros.split('.');
              const valida = partes.length <= 2 && (partes[1]?.length ?? 0) <= 2;
              const str = valida ? soloNumeros : ((formData as { qrStr?: string }).qrStr ?? '');
              const num = parseFloat(str);
              setFormData((prev) => ({ ...prev, qrStr: str, qr: str === '' ? undefined : (isNaN(num) ? undefined : Math.max(0, num)) }));
            }}
            placeholder="Ej: 0"
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
          />
        </div>

        {/* Resumen de Caja */}
        {(formData.cierreCaja ?? parseFloat((formData as { cierreCajaStr?: string }).cierreCajaStr ?? '')) > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Apertura:</span>
              <span className="font-semibold">Bs {formData.aperturaCaja}</span>
            </div>
            {(formData.qr ?? parseFloat((formData as { qrStr?: string }).qrStr ?? '')) > 0 && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">QR:</span>
              <span className="font-semibold">Bs {formData.qr ?? parseFloat((formData as { qrStr?: string }).qrStr ?? '')}</span>
            </div>
            )}
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Cierre:</span>
              <span className="font-semibold">Bs {formData.cierreCaja ?? parseFloat((formData as { cierreCajaStr?: string }).cierreCajaStr ?? '')}</span>
            </div>
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

