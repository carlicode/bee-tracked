import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { Turno } from '../types/turno';

export const IniciarTurno = () => {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [formData, setFormData] = useState<Partial<Turno>>({
    abejita: user?.driverName || '',
    aperturaCaja: 0,
    auto: '',
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

    if (!formData.abejita || !formData.auto || formData.aperturaCaja <= 0) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if (!location) {
      alert('Por favor obtén tu ubicación antes de iniciar el turno');
      return;
    }

    try {
      setLoading(true);
      
      // Registrar hora de inicio automáticamente
      const ahora = new Date();
      const horaInicio = ahora.toTimeString().slice(0, 5); // HH:MM
      
      // Aquí iría la llamada al API
      // Por ahora simulamos guardado
      const turnoData = {
        ...formData,
        horaInicio: horaInicio,
        ubicacionInicio: {
          ...location,
          timestamp: ahora.toISOString(),
        },
        turnoIniciado: true,
        turnoCerrado: false,
        createdAt: ahora.toISOString(),
      };

      // Guardar en localStorage para demo
      localStorage.setItem('turno_actual', JSON.stringify(turnoData));
      
      alert('Turno iniciado exitosamente');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error iniciando turno:', error);
      alert('Error al iniciar el turno. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-6">Iniciar Turno</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Abejita */}
        <div>
          <label htmlFor="abejita" className="block text-sm font-medium text-black mb-1">
            Abejita *
          </label>
          <input
            type="text"
            id="abejita"
            required
            value={formData.abejita}
            onChange={(e) => setFormData((prev) => ({ ...prev, abejita: e.target.value }))}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
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
            onChange={(e) => setFormData((prev) => ({ ...prev, aperturaCaja: parseFloat(e.target.value) || 0 }))}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
          />
        </div>

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
            onChange={(e) => setFormData((prev) => ({ ...prev, auto: e.target.value.toUpperCase() }))}
            placeholder="Ej: 6265 LYR"
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow uppercase"
          />
        </div>

        {/* Daños al Auto */}
        <div>
          <label htmlFor="danosAuto" className="block text-sm font-medium text-black mb-1">
            Daños al Auto *
          </label>
          <textarea
            id="danosAuto"
            required
            value={formData.danosAuto}
            onChange={(e) => setFormData((prev) => ({ ...prev, danosAuto: e.target.value }))}
            rows={3}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
            placeholder="Describe los daños o escribe 'ninguno'"
          />
        </div>

        {/* Ubicación */}
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
                Obteniendo ubicación...
              </span>
            ) : location ? (
              `📍 Ubicación: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
            ) : (
              '📍 Obtener Mi Ubicación'
            )}
          </button>
        </div>

        {/* Foto de Pantalla */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Foto de Pantalla *
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
              alt="Foto pantalla"
              className="mt-2 w-full max-w-xs rounded-lg shadow-md"
            />
          )}
        </div>

        {/* Foto del Exterior */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Foto del Exterior (en caso de golpes o daños) *
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

