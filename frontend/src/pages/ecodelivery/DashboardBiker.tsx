import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { storage } from '../../services/storage';
import type { TurnoSimple } from '../../types/turno';

export const DashboardBiker = () => {
  const [turnoActual, setTurnoActual] = useState<TurnoSimple | null>(null);

  useEffect(() => {
    // Cargar turno actual si existe
    const turno = storage.getItem<TurnoSimple>('turno_actual_biker');
    if (turno && turno.turnoIniciado && !turno.turnoCerrado) {
      setTurnoActual(turno);
    }
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-black mb-2">Bienvenido</h2>
        <p className="text-gray-700">¿Qué deseas hacer hoy?</p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        {/* Iniciar/Cerrar Turno */}
        <Link
          to={turnoActual ? '/ecodelivery/cerrar-turno' : '/ecodelivery/iniciar-turno'}
          className="bg-white rounded-xl shadow-lg p-8 border-2 border-ecodelivery-green hover:shadow-xl transition transform hover:scale-105"
        >
          <div className="flex items-center gap-6 mb-4">
            <div className="bg-ecodelivery-green rounded-full p-6">
              {turnoActual ? (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-black">
                {turnoActual ? 'Cerrar Turno' : 'Iniciar Turno'}
              </h3>
              <p className="text-base text-gray-600 mt-1">
                {turnoActual ? 'Finaliza tu jornada laboral' : 'Comienza tu jornada laboral'}
              </p>
            </div>
          </div>
          {turnoActual && (
            <div className="bg-ecodelivery-green/10 rounded-lg p-4 border border-ecodelivery-green/30">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Turno iniciado:</span> {turnoActual.horaInicio}
              </p>
            </div>
          )}
        </Link>

        {/* Registrar Delivery */}
        <Link
          to="/ecodelivery/nuevo-delivery"
          className="bg-white rounded-xl shadow-lg p-8 border-2 border-ecodelivery-green hover:shadow-xl transition transform hover:scale-105"
        >
          <div className="flex items-center gap-6 mb-4">
            <div className="bg-ecodelivery-green rounded-full p-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-black">Registrar Delivery</h3>
              <p className="text-base text-gray-600 mt-1">Registra un delivery realizado</p>
            </div>
          </div>
          <p className="text-gray-700">
            Registra los detalles del delivery: cliente, origen, destino
          </p>
        </Link>

        {/* Ver Deliveries */}
        <Link
          to="/ecodelivery/mis-deliveries"
          className="bg-white rounded-xl shadow-lg p-8 border-2 border-ecodelivery-green hover:shadow-xl transition transform hover:scale-105"
        >
          <div className="flex items-center gap-6 mb-4">
            <div className="bg-ecodelivery-green rounded-full p-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-black">Mis Deliveries</h3>
              <p className="text-base text-gray-600 mt-1">Historial de deliveries</p>
            </div>
          </div>
          <p className="text-gray-700">
            Revisa todos tus deliveries registrados
          </p>
        </Link>

        {/* Mis Turnos */}
        <Link
          to="/ecodelivery/mis-turnos"
          className="bg-white rounded-xl shadow-lg p-8 border-2 border-ecodelivery-green hover:shadow-xl transition transform hover:scale-105"
        >
          <div className="flex items-center gap-6 mb-4">
            <div className="bg-ecodelivery-green rounded-full p-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-black">Mis Turnos</h3>
              <p className="text-base text-gray-600 mt-1">Historial de turnos</p>
            </div>
          </div>
          <p className="text-gray-700">
            Revisa inicio y cierre de tus turnos
          </p>
        </Link>
      </div>
    </div>
  );
};
