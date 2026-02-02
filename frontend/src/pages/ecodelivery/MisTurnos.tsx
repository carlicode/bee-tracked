import { useState, useEffect } from 'react';
import { storage } from '../../services/storage';
import type { TurnoSimple } from '../../types/turno';

export const MisTurnos = () => {
  const [turnos, setTurnos] = useState<TurnoSimple[]>([]);
  const [turnoActual, setTurnoActual] = useState<TurnoSimple | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTurnos = () => {
      try {
        const historial = storage.getItem<TurnoSimple[]>('historial_turnos_biker') || [];
        setTurnos(historial);
        
        const actual = storage.getItem<TurnoSimple>('turno_actual_biker');
        if (actual && actual.turnoIniciado && !actual.turnoCerrado) {
          setTurnoActual(actual);
        }
      } catch (error) {
        console.error('Error cargando turnos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTurnos();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ecodelivery-green"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black mb-2">Mis Turnos</h2>
        <p className="text-gray-600">Historial de inicio y cierre de turnos</p>
      </div>

      {/* Turno Actual */}
      {turnoActual && (
        <div className="mb-6 bg-ecodelivery-green/10 border-2 border-ecodelivery-green rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-ecodelivery-green rounded-full animate-pulse"></div>
            <h3 className="text-lg font-bold text-black">Turno Actual (En curso)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Hora de inicio</p>
              <p className="text-lg font-semibold text-black">{turnoActual.horaInicio}</p>
            </div>
            {turnoActual.ubicacionInicio && (
              <div>
                <p className="text-sm text-gray-600">Ubicación inicial</p>
                <p className="text-xs font-mono text-black">
                  {turnoActual.ubicacionInicio.lat.toFixed(6)}, {turnoActual.ubicacionInicio.lng.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historial de Turnos */}
      {turnos.length === 0 && !turnoActual ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No hay turnos registrados</h3>
          <p className="text-gray-600">Los turnos cerrados aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-black">Historial</h3>
          {turnos.map((turno, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-l-4 border-gray-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-bold text-black">{turno.bikerName}</h4>
                  <p className="text-sm text-gray-600">
                    {turno.createdAt && new Date(turno.createdAt).toLocaleDateString('es-BO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="bg-gray-100 px-3 py-1 rounded-full">
                  <span className="text-sm font-semibold text-gray-700">Cerrado</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Hora de inicio</p>
                  <p className="text-base font-semibold text-black">{turno.horaInicio}</p>
                  {turno.ubicacionInicio && (
                    <p className="text-xs font-mono text-gray-600 mt-1">
                      📍 {turno.ubicacionInicio.lat.toFixed(6)}, {turno.ubicacionInicio.lng.toFixed(6)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-600">Hora de cierre</p>
                  <p className="text-base font-semibold text-black">{turno.horaCierre || 'N/A'}</p>
                  {turno.ubicacionFin && (
                    <p className="text-xs font-mono text-gray-600 mt-1">
                      📍 {turno.ubicacionFin.lat.toFixed(6)}, {turno.ubicacionFin.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
