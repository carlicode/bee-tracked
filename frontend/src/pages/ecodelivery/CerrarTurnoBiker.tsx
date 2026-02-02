import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { storage } from '../../services/storage';
import type { TurnoSimple } from '../../types/turno';

export const CerrarTurnoBiker = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [turnoActual, setTurnoActual] = useState<TurnoSimple | null>(null);

  useEffect(() => {
    const turno = storage.getItem<TurnoSimple>('turno_actual_biker');
    if (!turno || !turno.turnoIniciado || turno.turnoCerrado) {
      alert('No hay un turno activo para cerrar');
      navigate('/ecodelivery/dashboard');
      return;
    }
    setTurnoActual(turno);
  }, [navigate]);

  const handleGetLocationAndClose = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está disponible en tu dispositivo');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(newLocation);
        setLocationLoading(false);

        // Cerrar turno automáticamente
        await handleCloseShift(newLocation);
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

  const handleCloseShift = async (locationData: { lat: number; lng: number }) => {
    if (!turnoActual) return;

    try {
      setLoading(true);
      
      // Registrar hora de cierre automáticamente
      const ahora = new Date();
      const horaCierre = ahora.toTimeString().slice(0, 5); // HH:MM
      
      const turnoActualizado: TurnoSimple = {
        ...turnoActual,
        horaCierre: horaCierre,
        ubicacionFin: {
          ...locationData,
          timestamp: ahora.toISOString(),
        },
        turnoCerrado: true,
        updatedAt: ahora.toISOString(),
      };

      // Guardar en historial
      const historial = storage.getItem<TurnoSimple[]>('historial_turnos_biker') || [];
      historial.unshift(turnoActualizado);
      storage.setItem('historial_turnos_biker', historial);

      // Limpiar turno actual
      storage.removeItem('turno_actual_biker');
      
      alert('¡Turno cerrado exitosamente!');
      navigate('/ecodelivery/dashboard');
    } catch (error) {
      console.error('Error cerrando turno:', error);
      alert('Error al cerrar el turno. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!turnoActual) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-black mb-6">Cerrar Turno</h2>

      <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
        <div className="bg-ecodelivery-green/10 rounded-lg p-4 mb-6 border border-ecodelivery-green/30">
          <h3 className="font-bold text-black mb-2">Turno Actual</h3>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Hora de inicio:</span> {turnoActual.horaInicio}
          </p>
          {turnoActual.ubicacionInicio && (
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-semibold">Ubicación inicial:</span><br />
              Lat: {turnoActual.ubicacionInicio.lat.toFixed(6)}, Lng: {turnoActual.ubicacionInicio.lng.toFixed(6)}
            </p>
          )}
        </div>

        <div className="text-center">
          <div className="bg-ecodelivery-green/10 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-12 h-12 text-ecodelivery-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-black mb-3">
            Presiona el botón para obtener tu ubicación y cerrar turno
          </h3>
          <p className="text-gray-600 mb-8">
            Se registrará automáticamente tu ubicación y hora de cierre
          </p>

          {location && (
            <div className="bg-ecodelivery-green/10 rounded-lg p-4 mb-6 border border-ecodelivery-green/30">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">📍 Ubicación obtenida:</span><br />
                Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleGetLocationAndClose}
            disabled={locationLoading || loading}
            className="w-full bg-ecodelivery-green text-white px-8 py-6 rounded-lg hover:bg-ecodelivery-green-dark transition font-bold text-xl disabled:opacity-50 shadow-lg hover:shadow-xl"
          >
            {locationLoading || loading ? (
              <span className="flex items-center justify-center gap-3">
                <LoadingSpinner />
                {locationLoading ? 'Obteniendo ubicación...' : 'Cerrando turno...'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Obtener Ubicación y Cerrar Turno
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/ecodelivery/dashboard')}
            disabled={loading || locationLoading}
            className="flex-1 border-2 border-gray-300 text-black px-4 py-3 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
