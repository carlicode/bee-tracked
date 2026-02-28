import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { PLACAS_AUTO_ABEJITA } from '../../config/constants';
import { turnosApi } from '../../services/turnosApi';
import { formatters } from '../../utils/formatters';
import type { Turno } from '../../types/turno';

export const IniciarTurno = () => {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [deseaRegistrarDano, setDeseaRegistrarDano] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<Partial<Turno>>({
    abejita: user?.driverName || '',
    aperturaCaja: 0,
    auto: '',
    kilometraje: undefined,
    danosAuto: 'ninguno',
    fotoPantalla: '',
    fotoExterior: '',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const aperturaValida = formData.aperturaCaja != null && formData.aperturaCaja >= 0;
    if (!formData.abejita || !formData.auto || !aperturaValida) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if (deseaRegistrarDano === null) {
      alert('Por favor indica si desea registrar algún daño al auto (Sí o No)');
      return;
    }

    if (!location) {
      alert('Por favor obtén tu ubicación antes de iniciar el turno');
      return;
    }

    try {
      setLoading(true);

      const ahora = new Date();
      const horaInicio = formatters.timeToHHmm(ahora);
      const danos = deseaRegistrarDano ? formData.danosAuto || 'ninguno' : 'ninguno';
      const fotoExt = deseaRegistrarDano ? formData.fotoExterior : '';

      const turnoData = {
        ...formData,
        danosAuto: danos,
        fotoExterior: fotoExt,
        horaInicio,
        ubicacionInicio: {
          ...location,
          timestamp: ahora.toISOString(),
        },
        turnoIniciado: true,
        turnoCerrado: false,
        createdAt: ahora.toISOString(),
      };

      let id: string | undefined;

      if (turnosApi.isEnabled()) {
        const res = await turnosApi.iniciar({
          abejita: turnoData.abejita!,
          auto: turnoData.auto!,
          aperturaCaja: turnoData.aperturaCaja!,
          kilometraje: turnoData.kilometraje,
          danosAuto: danos,
          fotoPantalla: turnoData.fotoPantalla,
          fotoExterior: fotoExt,
          horaInicio,
          ubicacionInicio: { lat: location.lat, lng: location.lng },
        });
        id = res.id;
      }

      const toSave = { ...turnoData, id };
      localStorage.setItem('turno_actual', JSON.stringify(toSave));

      alert('Turno iniciado exitosamente');
      navigate('/beezero/dashboard');
    } catch (error) {
      console.error('Error iniciando turno:', error);
      const msg = error instanceof Error ? error.message : 'Error al iniciar el turno. Intenta nuevamente.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

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
      <h2 className="text-2xl font-bold text-black mb-6">Iniciar Turno</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Abejita (solo lectura: nombre del usuario logueado) */}
        <div>
          <label htmlFor="abejita" className="block text-sm font-medium text-black mb-1">
            Abejita *
          </label>
          <input
            type="text"
            id="abejita"
            readOnly
            disabled
            value={formData.abejita}
            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 bg-gray-50 cursor-not-allowed text-gray-700 font-medium"
          />
        </div>

        {/* Apertura de Caja */}
        <div>
          <label htmlFor="aperturaCaja" className="block text-sm font-medium text-black mb-1">
            Apertura de Caja (Bs) *
          </label>
          <input
            type="number"
            id="aperturaCaja"
            required
            min="0"
            step="0.01"
            value={formData.aperturaCaja}
            onChange={(e) => {
              const valor = parseFloat(e.target.value);
              const aperturaCaja = isNaN(valor) ? 0 : Math.max(0, valor);
              setFormData((prev) => ({ ...prev, aperturaCaja }));
            }}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
          />
        </div>

        {/* Auto (Placa) */}
        <div>
          <label htmlFor="auto" className="block text-sm font-medium text-black mb-1">
            Auto (Placa) *
          </label>
          <select
            id="auto"
            required
            value={formData.auto}
            onChange={(e) => setFormData((prev) => ({ ...prev, auto: e.target.value }))}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow bg-white"
          >
            <option value="">Selecciona la placa del auto</option>
            {PLACAS_AUTO_ABEJITA.map((placa) => (
              <option key={placa} value={placa}>
                {placa}
              </option>
            ))}
          </select>
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

        {/* Kilometraje */}
        <div>
          <label htmlFor="kilometraje" className="block text-sm font-medium text-black mb-1">
            Kilometraje
          </label>
          <input
            type="number"
            id="kilometraje"
            min={0}
            value={formData.kilometraje ?? ''}
            onChange={(e) => {
              const valor = e.target.value === '' ? undefined : Number(e.target.value);
              setFormData((prev) => ({ ...prev, kilometraje: valor !== undefined && valor >= 0 ? valor : undefined }));
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

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 border-2 border-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !location}
            className="flex-1 bg-beezero-yellow text-black px-4 py-2 rounded-lg hover:bg-beezero-yellow-dark transition disabled:opacity-50 font-semibold shadow-md"
          >
            {loading ? 'Iniciando...' : 'Iniciar Turno'}
          </button>
        </div>
      </form>
    </div>
  );
};

