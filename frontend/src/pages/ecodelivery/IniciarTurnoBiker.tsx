import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { storage } from '../../services/storage';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useSessionGate } from '../../hooks/useSessionGate';
import { SessionExpiredPrompt } from '../../components/SessionExpiredPrompt';
import { ecodeliveryApi, isEcodeliveryApiEnabled } from '../../services/ecodeliveryApi';
import { formatters } from '../../utils/formatters';
import type { TurnoSimple } from '../../types/turno';

export const IniciarTurnoBiker = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { getCurrentUser, getUserType } = useAuth();
  const user = getCurrentUser();
  const isOperador = getUserType() === 'operador';
  const dashboardPath = isOperador ? '/operador/dashboard' : '/ecodelivery/dashboard';
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [turnoIniciado, setTurnoIniciado] = useState(false);
  const { image: photoDataUrl, loading: photoLoading, handleFileChange: handlePhotoChange, clearImage: clearPhoto, error: photoError } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sessionExpired, sessionMessage, checkingSession, guardAction, relogin } = useSessionGate();

  useEffect(() => {
    if (!isEcodeliveryApiEnabled() || !user?.driverName) return;
    void (async () => {
      const activo = await ecodeliveryApi.getTurnoActivo(user.driverName);
      if (activo) {
        storage.setItem('turno_actual_biker', activo);
        toast.show('Ya tenés un turno activo. Cerralo desde el panel.', 'info');
        navigate(dashboardPath);
      }
    })();
  }, [dashboardPath, navigate, toast, user?.driverName]);

  const captureLocationAndStart = () => {
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
        const msg = error.code === 1
          ? 'Permiso de ubicación bloqueado. Para habilitarlo: abrí el navegador → tocá el ícono 🔒 o ⚙️ en la barra de direcciones → Permisos → Ubicación → Permitir. Luego recargá la página.'
          : 'No se pudo obtener la ubicación. Verificá que el GPS esté activado e intentá nuevamente.';
        toast.show(msg, 'error');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleGetLocationAndStart = () => {
    void guardAction(captureLocationAndStart);
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
            tipo: isOperador ? 'operador' : 'ecodelivery',
          });
          turnoId = res.turnoId;
        } catch (err: unknown) {
          console.error('Error registrando turno en sheet:', err);
          const axiosErr = err as { response?: { status?: number } };
          if (axiosErr?.response?.status === 401) {
            toast.show('Tu sesión expiró. Iniciá sesión de nuevo.', 'error');
            setTimeout(() => relogin(), 2500);
            return;
          }
          if (axiosErr?.response?.status === 409) {
            toast.show('Ya tenés un turno activo. Cerralo desde el panel.', 'info');
            navigate(dashboardPath);
            return;
          }
          toast.show('Turno guardado localmente. No se pudo registrar en el servidor.', 'info');
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
      setTurnoIniciado(true);
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

        {/* ── Pantalla de éxito ── */}
        {turnoIniciado && (
          <div className="text-center py-4 space-y-5">
            <div className="text-6xl animate-bounce">🐝</div>
            <h3 className="text-2xl font-bold text-ecodelivery-green">¡Turno iniciado correctamente!</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 space-y-3 text-left">
              <p className="flex items-start gap-2 text-sm font-semibold text-amber-800">
                <span className="text-lg leading-none">⚠️</span>
                No olvides salir de la app cuando termines de usarla.
              </p>
              <p className="flex items-start gap-2 text-sm text-amber-700">
                <span className="text-lg leading-none">🔄</span>
                Cuando quieras cerrar tu turno, volvé a iniciar sesión y tocá <strong>"Cerrar Turno"</strong> desde el panel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(dashboardPath)}
              className="w-full bg-ecodelivery-green text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-green-600 transition shadow"
            >
              Ir al panel
            </button>
          </div>
        )}

        {/* ── Loading overlay ── */}
        {!turnoIniciado && (locationLoading || loading || checkingSession) && (
          <div className="text-center py-6">
            <div className="text-5xl mb-5">🐝</div>
            <p className="text-xl font-bold text-gray-800 mb-1">
              {checkingSession ? 'Verificando sesión...' : locationLoading ? 'Obteniendo ubicación...' : 'Registrando tu turno...'}
            </p>
            <div className="flex justify-center gap-3 my-5">
              <span className="w-4 h-4 rounded-full bg-ecodelivery-green animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-4 h-4 rounded-full bg-ecodelivery-green animate-bounce" style={{ animationDelay: '180ms' }} />
              <span className="w-4 h-4 rounded-full bg-ecodelivery-green animate-bounce" style={{ animationDelay: '360ms' }} />
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Esto puede tardar unos segundos,<br />no cierres la app 😊
            </p>
          </div>
        )}

        <div className={`text-center ${turnoIniciado || locationLoading || loading || checkingSession ? 'hidden' : ''}`}>
          {sessionExpired ? (
            <SessionExpiredPrompt message={sessionMessage} onRelogin={relogin} theme="ecodelivery" />
          ) : (
          <>
          <div className="bg-ecodelivery-green/10 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-12 h-12 text-ecodelivery-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-black mb-3">
            Presiona el botón para obtener tu ubicación e iniciar turno
          </h3>

          {/* Foto Hillu */}
          <div className="mb-6 text-center">
            <p className="text-base font-semibold text-gray-800 mb-3">Foto (Hillu)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
            />
            {!photoDataUrl ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-dashed border-ecodelivery-green rounded-xl text-ecodelivery-green font-medium hover:bg-ecodelivery-green hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Tomar foto
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <img src={photoDataUrl} alt="Vista previa" className="h-28 w-28 object-cover rounded-xl border-2 border-ecodelivery-green shadow" />
                <button type="button" onClick={clearPhoto} className="text-sm text-red-600 hover:underline">
                  Quitar foto
                </button>
              </div>
            )}
            {photoLoading && <p className="text-sm text-gray-500 mt-1">Procesando foto…</p>}
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
          </>
          )}
        </div>

        {!turnoIniciado && !(locationLoading || loading || checkingSession || sessionExpired) && (
        <div className="flex gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(dashboardPath)}
            className="flex-1 border-2 border-gray-300 text-black px-4 py-3 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancelar
          </button>
        </div>
        )}
      </div>
    </div>
  );
};
