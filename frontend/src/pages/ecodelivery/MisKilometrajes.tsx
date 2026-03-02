import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ecodeliveryApi, isEcodeliveryApiEnabled } from '../../services/ecodeliveryApi';
import { useAuth } from '../../services/auth';
import { LinkableText } from '../../components/LinkableText';
import type { KilometrajeRegistro } from '../../types';

export const MisKilometrajes = () => {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const bikerName = user?.driverName || user?.name || '';

  const [registros, setRegistros] = useState<KilometrajeRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRegistros = async () => {
      if (!isEcodeliveryApiEnabled() || !bikerName) {
        setLoading(false);
        setError('El módulo Kilometraje requiere el backend configurado.');
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const { registros: data } = await ecodeliveryApi.getMisKilometrajes(bikerName);
        setRegistros(data);
      } catch (err) {
        console.error('Error cargando kilometrajes:', err);
        setError('No se pudieron cargar los registros de kilometraje.');
      } finally {
        setLoading(false);
      }
    };
    loadRegistros();
  }, [bikerName]);

  const getRegistroLabel = (r: KilometrajeRegistro) => {
    const cliente = (r['Cliente'] ?? r['cliente'] ?? '').toString();
    const recojo = (r['Recojo'] ?? r['Direccion Recojo'] ?? '').toString();
    const entrega = (r['Entrega'] ?? r['Direccion Entrega'] ?? '').toString();
    if (cliente) return cliente;
    if (recojo && entrega) return `${recojo} → ${entrega}`;
    return `Carrera #${r.id}`;
  };

  const formatFecha = (r: KilometrajeRegistro) => {
    const fecha = (r['Fecha Registro'] ?? r['Fechas'] ?? r['fecha'] ?? '').toString();
    if (!fecha) return '';
    try {
      const d = fecha.includes('/')
        ? new Date(fecha.split('/').reverse().join('-'))
        : new Date(fecha);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('es-BO', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    } catch {
      /* ignore */
    }
    return fecha;
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
        <h2 className="text-2xl font-bold text-black mb-2">Mis Kilometrajes</h2>
        <p className="text-gray-600">Historial de kilometraje registrado por carrera</p>
      </div>

      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-sm text-yellow-700">{error}</p>
        </div>
      )}

      {!error && registros.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No hay registros de kilometraje</h3>
          <p className="text-gray-600 mb-6">Registra el kilometraje de tus carreras desde el módulo Kilometraje</p>
          <button
            type="button"
            onClick={() => navigate('/ecodelivery/kilometraje')}
            className="inline-block bg-ecodelivery-green text-white px-6 py-3 rounded-lg hover:bg-ecodelivery-green-dark transition font-semibold shadow-md"
          >
            Ir a Kilometraje
          </button>
        </div>
      )}

      {!error && registros.length > 0 && (
        <div className="space-y-4">
          {registros.map((reg, index) => (
            <div
              key={reg.id + index}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-l-4 border-ecodelivery-green"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-bold text-black">{getRegistroLabel(reg)}</h3>
                  <p className="text-sm text-gray-600 mt-1">{formatFecha(reg)}</p>
                </div>
                <div className="bg-ecodelivery-green/10 px-3 py-1 rounded-full">
                  <span className="text-sm font-semibold text-ecodelivery-green">
                    {reg.kilometraje} km
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {(reg['Direccion Recojo'] || reg['Recojo']) ? (
                  <p>
                    Recojo: <LinkableText text={String(reg['Direccion Recojo'] ?? reg['Recojo'] ?? '')} />
                  </p>
                ) : null}
                {(reg['Direccion Entrega'] || reg['Entrega']) ? (
                  <p>
                    Entrega: <LinkableText text={String(reg['Direccion Entrega'] ?? reg['Entrega'] ?? '')} />
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
