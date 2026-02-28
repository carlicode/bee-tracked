import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { storage } from '../../services/storage';
import { useImageUpload } from '../../hooks/useImageUpload';
import { ecodeliveryApi, isEcodeliveryApiEnabled } from '../../services/ecodeliveryApi';
import { formatters } from '../../utils/formatters';
import type { TurnoSimple } from '../../types/turno';

export const IniciarTurnoBiker = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const { image: photoDataUrl, handleFileChange: handlePhotoChange, clearImage: clearPhoto, error: photoError } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGetLocationAndStart = () => {
    if (!navigator.geolocation) {
      toast.show('La geolocalización no está disponible en tu dispositivo', 'error');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocationLoading(false);

        // Iniciar turno automáticamente
        await handleStartShift(newLocation);
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

  const handleStartShift = async (locationData: { lat: number; lng: number }) => {
    try {
      setLoading(true);

      let photoUrl: string | undefined;
      if (photoDataUrl) {
        try {
          const { url } = await ecodeliveryApi.uploadPhoto({
            dataUrl: photoDataUrl,
            username: user?.driverName || user?.name || 'Biker',
            momento: 'inicio',
          });
          photoUrl = url;
        } catch (err) {
          console.error('Error subiendo foto:', err);
          toast.show('No se pudo subir la foto. ¿Backend y S3 configurados? Puedes iniciar turno sin foto.', 'error');
        }
      }

      const ahora = new Date();
      const horaInicio = formatters.timeToHHmm(ahora);
      const fechaInicio = ahora.toISOString().slice(0, 10); // YYYY-MM-DD
      const bikerName = user?.driverName || user?.name || 'Biker';

      let turnoId: string | undefined;
      if (isEcodeliveryApiEnabled()) {
        try {
          const res = await ecodeliveryApi.iniciarTurno({
            usuario: bikerName,
            fechaInicio,
            horaInicio,
            latInicio: locationData.lat,
            lngInicio: locationData.lng,
            timestampInicio: ahora.toISOString(),
            fotoInicio: photoUrl,
          });
          turnoId = res.turnoId;
        } catch (err) {
          console.error('Error registrando turno en sheet:', err);
          toast.show('Turno guardado localmente. No se pudo registrar en el Sheet (¿backend y GOOGLE_SHEET_ID configurados?).', 'info');
        }
      }

      const turnoData: TurnoSimple = {
        ...(turnoId && { id: turnoId }),
        bikerName,
        horaInicio,
        ubicacionInicio: {
          ...locationData,
          timestamp: ahora.toISOString(),
        },
        turnoIniciado: true,
        turnoCerrado: false,
        createdAt: ahora.toISOString(),
        ...(photoUrl && { fotoInicio: photoUrl }),
      };

      storage.setItem('turno_actual_biker', turnoData);
      toast.show('¡Turno iniciado exitosamente!', 'success');
      navigate('/ecodelivery/dashboard');
    } catch (error) {
      console.error('Error iniciando turno:', error);
      toast.show('Error al iniciar el turno. Intenta nuevamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/ecodelivery/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-black font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver atrás
        </button>
      </div>
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
          <p className="text-gray-600 mb-6">
            Se registrará automáticamente tu ubicación, hora de inicio y nombre
          </p>

          {/* Foto opcional */}
          <div className="mb-6 text-left">
            <p className="text-sm font-medium text-gray-700 mb-2">Foto (opcional)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
            />
            {!photoDataUrl ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-ecodelivery-green hover:text-ecodelivery-green transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                </svg>
                Subir foto
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <img src={photoDataUrl} alt="Vista previa" className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
                <div>
                  <p className="text-sm text-gray-600">Foto lista para subir a S3</p>
                  <button type="button" onClick={clearPhoto} className="text-sm text-red-600 hover:underline mt-1">
                    Quitar foto
                  </button>
                </div>
              </div>
            )}
            {photoError && <p className="text-sm text-red-600 mt-1">{photoError}</p>}
          </div>

          <button
            type="button"
            onClick={handleGetLocationAndStart}
            disabled={locationLoading || loading}
            className="w-full bg-ecodelivery-green text-white px-8 py-6 rounded-lg hover:bg-ecodelivery-green-dark transition font-bold text-xl disabled:opacity-50 shadow-lg hover:shadow-xl"
          >
            {locationLoading || loading ? (
              <span className="flex items-center justify-center gap-3">
                <LoadingSpinner />
                Cargando
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Abrir turno
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
