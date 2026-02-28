import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Turno } from '../types/turno';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const DetalleTurno = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [turno, setTurno] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTurno();
  }, [id]);

  const loadTurno = () => {
    try {
      setLoading(true);
      
      if (id === 'actual') {
        // Cargar turno actual
        const turnoActualData = localStorage.getItem('turno_actual');
        if (turnoActualData) {
          setTurno(JSON.parse(turnoActualData));
        }
      } else {
        // Cargar del historial
        const turnosHistorial = JSON.parse(localStorage.getItem('turnos_historial') || '[]');
        const turnoEncontrado = turnosHistorial[parseInt(id || '0')] || null;
        setTurno(turnoEncontrado);
      }
    } catch (error) {
      console.error('Error cargando turno:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularDiferenciaCaja = () => {
    if (!turno) return 0;
    const apertura = turno.aperturaCaja || 0;
    const cierre = turno.cierreCaja || 0;
    const qr = turno.qr || 0;
    return cierre - apertura - qr;
  };

  const formatFecha = (fecha: string | undefined) => {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!turno) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-700 mb-4">Turno no encontrado</p>
        <button
          onClick={() => navigate('/mis-turnos')}
          className="bg-beezero-yellow text-black px-6 py-2 rounded-lg hover:bg-beezero-yellow-dark transition font-semibold"
        >
          Volver a Mis Turnos
        </button>
      </div>
    );
  }

  const diferencia = calcularDiferenciaCaja();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Detalle del Turno</h2>
        <button
          onClick={() => navigate('/mis-turnos')}
          className="text-gray-600 hover:text-black transition"
        >
          ← Volver
        </button>
      </div>

      {/* Información General */}
      <div className="bg-beezero-yellow rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-black mb-2">
              {turno.abejita} - {turno.auto}
            </h3>
            <div className="space-y-1 text-sm text-black/70">
              <p>
                <strong>Inicio:</strong> {formatFecha(turno.createdAt)}
                {turno.horaInicio && (
                  <span className="ml-2 font-bold text-black">({turno.horaInicio})</span>
                )}
              </p>
              {turno.turnoCerrado && (
                <p>
                  <strong>Cierre:</strong> {formatFecha(turno.updatedAt)}
                  {turno.horaCierre && (
                    <span className="ml-2 font-bold text-black">({turno.horaCierre})</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-xs font-semibold ${
            turno.turnoCerrado 
              ? 'bg-green-100 text-green-800' 
              : 'bg-black text-white'
          }`}>
            {turno.turnoCerrado ? 'CERRADO' : 'EN CURSO'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información de Inicio */}
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-beezero-yellow">
          <h3 className="text-lg font-bold text-black mb-4">📋 Información de Inicio</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Abejita</p>
              <p className="font-semibold text-black">{turno.abejita}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Auto (Placa)</p>
              <p className="font-semibold text-black text-lg">{turno.auto}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Hora de Inicio</p>
              <p className="font-bold text-black text-xl">
                {turno.horaInicio || 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Apertura de Caja</p>
              <p className="font-bold text-black text-2xl">Bs {turno.aperturaCaja}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Daños al Auto</p>
              <p className="font-medium text-black">{turno.danosAuto}</p>
            </div>

            {turno.ubicacionInicio && (
              <div>
                <p className="text-sm text-gray-600">📍 Ubicación de Inicio</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatFecha(turno.ubicacionInicio.timestamp)}
                </p>
              </div>
            )}

            {/* Fotos ocultas temporalmente (S3 sin acceso público) */}
            {/* {turno.fotoPantalla && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Foto del tablero</p>
                <img
                  src={turno.fotoPantalla}
                  alt="Foto del tablero inicio"
                  className="w-full rounded-lg shadow-md"
                />
              </div>
            )}

            {turno.fotoExterior && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Foto del Exterior (Inicio)</p>
                <img
                  src={turno.fotoExterior}
                  alt="Foto exterior inicio"
                  className="w-full rounded-lg shadow-md"
                />
              </div>
            )} */}
          </div>
        </div>

        {/* Información de Cierre */}
        {turno.turnoCerrado ? (
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-beezero-yellow">
            <h3 className="text-lg font-bold text-black mb-4">✅ Información de Cierre</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Hora de Cierre</p>
                <p className="font-bold text-black text-xl">
                  {turno.horaCierre || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Cierre de Caja</p>
                <p className="font-bold text-black text-2xl">Bs {turno.cierreCaja}</p>
              </div>

              {turno.qr && turno.qr > 0 && (
                <div>
                  <p className="text-sm text-gray-600">QR</p>
                  <p className="font-semibold text-black text-xl">Bs {turno.qr}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Apertura:</span>
                  <span className="font-semibold">Bs {turno.aperturaCaja}</span>
                </div>
                {turno.qr && turno.qr > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700">QR:</span>
                    <span className="font-semibold">Bs {turno.qr}</span>
                  </div>
                )}
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Cierre:</span>
                  <span className="font-semibold">Bs {turno.cierreCaja}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-black">Diferencia:</span>
                  <span className={`font-bold text-lg ${diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Bs {diferencia.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Daños al Auto</p>
                <p className="font-medium text-black">{turno.danosAuto}</p>
              </div>

              {turno.ubicacionFin && (
                <div>
                  <p className="text-sm text-gray-600">📍 Ubicación de Cierre</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFecha(turno.ubicacionFin.timestamp)}
                  </p>
                </div>
              )}

              {/* Fotos ocultas temporalmente (S3 sin acceso público) */}
              {/* {turno.fotoPantalla && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Foto del tablero (Cierre)</p>
                  <img
                    src={turno.fotoPantalla}
                    alt="Foto del tablero cierre"
                    className="w-full rounded-lg shadow-md"
                  />
                </div>
              )}

              {turno.fotoExterior && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Foto del Exterior (Cierre)</p>
                  <img
                    src={turno.fotoExterior}
                    alt="Foto exterior cierre"
                    className="w-full rounded-lg shadow-md"
                  />
                </div>
              )} */}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Turno aún no cerrado</p>
              <button
                onClick={() => navigate('/cerrar-turno')}
                className="bg-beezero-yellow text-black px-6 py-2 rounded-lg hover:bg-beezero-yellow-dark transition font-semibold"
              >
                Cerrar Turno
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resumen de Carreras */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6 border-2 border-beezero-yellow">
        <h3 className="text-lg font-bold text-black mb-4">🚗 Resumen de Carreras</h3>
        <p className="text-gray-600 text-sm mb-4">
          Las carreras registradas durante este turno aparecerán aquí.
        </p>
        <Link
          to="/mis-carreras"
          className="text-beezero-yellow hover:text-beezero-yellow-dark font-semibold"
        >
          Ver todas las carreras →
        </Link>
      </div>
    </div>
  );
};

