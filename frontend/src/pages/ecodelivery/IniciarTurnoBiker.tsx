import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { storage } from '../../services/storage';
import type { TurnoSimple } from '../../types/turno';

export const IniciarTurnoBiker = () => {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleGetLocationAndStart = () => {
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

        // Iniciar turno automáticamente
        await handleStartShift(newLocation);
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

  const handleStartShift = async (locationData: { lat: number; lng: number }) => {
    try {
      setLoading(true);
      
      // Registrar hora de inicio automáticamente
      const ahora = new Date();
      const horaInicio = ahora.toTimeString().slice(0, 5); // HH:MM
      
      const turnoData: TurnoSimple = {
        bikerName: user?.driverName || 'Biker',
        horaInicio: horaInicio,
        ubicacionInicio: {
          ...locationData,
          timestamp: ahora.toISOString(),
        },
        turnoIniciado: true,
        turnoCerrado: false,
        createdAt: ahora.toISOString(),
      };

      // Guardar en localStorage para demo
      storage.setItem('turno_actual_biker', turnoData);
      
      alert('¡Turno iniciado exitosamente!');
      navigate('/ecodelivery/dashboard');
    } catch (error) {
      console.error('Error iniciando turno:', error);
      alert('Error al iniciar el turno. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-black mb-6">Iniciar Turno</h2>

      <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
        <div className="text-center">
          <div className="bg-ecodelivery-green/10 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-12 h-12 text-ecodelivery-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-black mb-3">
            Presiona el botón para obtener tu ubicación e iniciar turno
          </h3>
          <p className="text-gray-600 mb-8">
            Se registrará automáticamente tu ubicación, hora de inicio y nombre
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
            onClick={handleGetLocationAndStart}
            disabled={locationLoading || loading}
            className="w-full bg-ecodelivery-green text-white px-8 py-6 rounded-lg hover:bg-ecodelivery-green-dark transition font-bold text-xl disabled:opacity-50 shadow-lg hover:shadow-xl"
          >
            {locationLoading || loading ? (
              <span className="flex items-center justify-center gap-3">
                <LoadingSpinner />
                {locationLoading ? 'Obteniendo ubicación...' : 'Iniciando turno...'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Obtener Ubicación e Iniciar Turno
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
