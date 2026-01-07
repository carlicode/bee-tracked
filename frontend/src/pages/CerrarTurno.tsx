import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { Turno } from '../types/turno';

export const CerrarTurno = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [turnoInicio, setTurnoInicio] = useState<Partial<Turno> | null>(null);

  const [formData, setFormData] = useState<Partial<Turno>>({
    cierreCaja: 0,
    qr: 0,
    danosAuto: 'ninguno',
    fotoPantalla: '',
    fotoExterior: '',
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
    const cierre = formData.cierreCaja || 0;
    const qr = formData.qr || 0;
    return cierre - apertura - qr;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cierreCaja || formData.cierreCaja <= 0) {
      alert('Por favor ingresa el cierre de caja');
      return;
    }

    if (!location) {
      alert('Por favor obtén tu ubicación antes de cerrar el turno');
      return;
    }

    try {
      setLoading(true);
      
      // Registrar hora de cierre automáticamente
      const ahora = new Date();
      const horaCierre = ahora.toTimeString().slice(0, 5); // HH:MM
      
      const turnoCompleto = {
        ...turnoInicio,
        ...formData,
        horaCierre: horaCierre,
        ubicacionFin: {
          ...location,
          timestamp: ahora.toISOString(),
        },
        turnoCerrado: true,
        updatedAt: ahora.toISOString(),
      };

      // Guardar en localStorage para demo
      const turnosHistorial = JSON.parse(localStorage.getItem('turnos_historial') || '[]');
      turnosHistorial.push(turnoCompleto);
      localStorage.setItem('turnos_historial', JSON.stringify(turnosHistorial));
      localStorage.removeItem('turno_actual');
      
      alert('Turno cerrado exitosamente');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error cerrando turno:', error);
      alert('Error al cerrar el turno. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!turnoInicio) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-700 mb-4">No hay un turno iniciado para cerrar</p>
        <button
          onClick={() => navigate('/iniciar-turno')}
          className="bg-beezero-yellow text-black px-6 py-2 rounded-lg hover:bg-beezero-yellow-dark transition font-semibold"
        >
          Ir a Iniciar Turno
        </button>
      </div>
    );
  }

  return (
    <div>
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
        {/* Cierre de Caja */}
        <div>
          <label htmlFor="cierreCaja" className="block text-sm font-medium text-black mb-1">
            Cierre de Caja (Bs) *
          </label>
          <input
            type="number"
            id="cierreCaja"
            required
            min="0"
            step="0.01"
            value={formData.cierreCaja}
            onChange={(e) => setFormData((prev) => ({ ...prev, cierreCaja: parseFloat(e.target.value) || 0 }))}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
          />
        </div>

        {/* QR */}
        <div>
          <label htmlFor="qr" className="block text-sm font-medium text-black mb-1">
            QR (Bs)
          </label>
          <input
            type="number"
            id="qr"
            min="0"
            step="0.01"
            value={formData.qr}
            onChange={(e) => setFormData((prev) => ({ ...prev, qr: parseFloat(e.target.value) || 0 }))}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
          />
        </div>

        {/* Resumen de Caja */}
        {formData.cierreCaja && formData.cierreCaja > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Apertura:</span>
              <span className="font-semibold">Bs {formData.aperturaCaja}</span>
            </div>
            {formData.qr && formData.qr > 0 && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">QR:</span>
                <span className="font-semibold">Bs {formData.qr}</span>
              </div>
            )}
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Cierre:</span>
              <span className="font-semibold">Bs {formData.cierreCaja}</span>
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
            {loading ? 'Cerrando...' : 'Cerrar Turno'}
          </button>
        </div>
      </form>
    </div>
  );
};

