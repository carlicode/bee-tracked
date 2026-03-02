import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ecodeliveryApi, isEcodeliveryApiEnabled } from '../../services/ecodeliveryApi';
import { useAuth } from '../../services/auth';
import { useToast } from '../../contexts/ToastContext';
import { LinkableText } from '../../components/LinkableText';
import type { CarreraRegistro } from '../../types';

export const Kilometraje = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const bikerName = user?.driverName || user?.name || '';

  const [carreras, setCarreras] = useState<CarreraRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalCarrera, setModalCarrera] = useState<CarreraRegistro | null>(null);
  const [kmInput, setKmInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadCarreras = async () => {
      if (!isEcodeliveryApiEnabled() || !bikerName) {
        setLoading(false);
        setError('El módulo Kilometraje requiere el backend configurado.');
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const { carreras: data } = await ecodeliveryApi.getCarrerasDelDia(bikerName);
        setCarreras(data);
      } catch (err) {
        console.error('Error cargando carreras:', err);
        setError('No se pudieron cargar las carreras del día.');
      } finally {
        setLoading(false);
      }
    };
    loadCarreras();
  }, [bikerName]);

  const handleRegistrarKm = async () => {
    if (!modalCarrera || !bikerName) return;
    const kmStr = kmInput.trim();
    if (!kmStr) {
      toast.show('Ingresa el kilometraje', 'info');
      return;
    }
    try {
      setSubmitting(true);
      await ecodeliveryApi.registrarKilometraje({
        carreraId: modalCarrera.id,
        bikerName,
        kilometraje: kmStr,
      });
      toast.show('Kilometraje registrado exitosamente', 'success');
      setModalCarrera(null);
      setKmInput('');
      const { carreras: data } = await ecodeliveryApi.getCarrerasDelDia(bikerName);
      setCarreras(data);
    } catch (err) {
      console.error('Error registrando kilometraje:', err);
      toast.show(err instanceof Error ? err.message : 'Error al registrar kilometraje', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getCarreraLabel = (c: CarreraRegistro) => {
    const cliente = (c['Cliente'] ?? c['cliente'] ?? '').toString();
    const recojo = (c['Recojo'] ?? c['Direccion Recojo'] ?? c['recojo'] ?? '').toString();
    const entrega = (c['Entrega'] ?? c['Direccion Entrega'] ?? c['entrega'] ?? '').toString();
    if (cliente) return cliente;
    if (recojo && entrega) return `${recojo} → ${entrega}`;
    return `Carrera #${c.id}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ecodelivery-green"></div>
      </div>
    );
  }

  return (
    <div>
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black mb-2">Kilometraje</h2>
        <p className="text-gray-600">Carreras del día – registra el kilometraje de cada carrera</p>
      </div>

      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-sm text-yellow-700">{error}</p>
        </div>
      )}

      {!error && carreras.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No hay carreras hoy</h3>
          <p className="text-gray-600">No tienes carreras asignadas para el día de hoy</p>
        </div>
      )}

      {!error && carreras.length > 0 && (
        <div className="space-y-4">
          {carreras.map((carrera) => (
            <div
              key={carrera.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-l-4 border-ecodelivery-green"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-black truncate">{getCarreraLabel(carrera)}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <LinkableText
                      text={
                        [
                          String(carrera['Direccion Recojo'] ?? carrera['Recojo'] ?? ''),
                          (carrera['Direccion Recojo'] || carrera['Recojo']) ? ' → ' : '',
                          String(carrera['Direccion Entrega'] ?? carrera['Entrega'] ?? ''),
                        ].join('')
                      }
                    />
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Hora: {(carrera['Hora Ini'] ?? carrera['Hora Registro'] ?? '').toString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalCarrera(carrera);
                    setKmInput('');
                  }}
                  className="flex-shrink-0 bg-ecodelivery-green text-white px-4 py-2 rounded-lg hover:bg-ecodelivery-green-dark transition font-semibold text-sm"
                >
                  Registrar km
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalCarrera && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-black mb-2">Registrar kilometraje</h3>
            <p className="text-gray-600 text-sm mb-4">{getCarreraLabel(modalCarrera)}</p>
            <label htmlFor="km-input" className="block text-sm font-medium text-black mb-2">
              Kilometraje (km)
            </label>
            <input
              id="km-input"
              type="text"
              inputMode="decimal"
              value={kmInput}
              onChange={(e) => setKmInput(e.target.value)}
              placeholder="Ej: 5.2 o 5,2 o 5.2, 3.1"
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ecodelivery-green focus:border-ecodelivery-green mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalCarrera(null);
                  setKmInput('');
                }}
                className="flex-1 border-2 border-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRegistrarKm}
                disabled={submitting}
                className="flex-1 bg-ecodelivery-green text-white px-4 py-2 rounded-lg hover:bg-ecodelivery-green-dark transition font-semibold disabled:opacity-50"
              >
                {submitting ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
