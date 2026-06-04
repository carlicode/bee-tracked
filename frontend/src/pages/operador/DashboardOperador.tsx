import { useState, useEffect } from 'react';
import { DashboardCard } from '../../components/DashboardCard';
import { storage } from '../../services/storage';
import { isEcodeliveryApiEnabled } from '../../services/ecodeliveryApi';
import { usePushSubscription } from '../../hooks/usePushSubscription';
import type { TurnoSimple } from '../../types/turno';

const IconPlay = () => (
  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconStop = () => (
  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
);

const IconLive = () => (
  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

export const DashboardOperador = () => {
  const [turnoActual, setTurnoActual] = useState<TurnoSimple | null>(null);

  usePushSubscription(isEcodeliveryApiEnabled());

  useEffect(() => {
    const turno = storage.getItem<TurnoSimple>('turno_actual_biker');
    if (turno && turno.turnoIniciado && !turno.turnoCerrado) {
      setTurnoActual(turno);
    }
  }, []);

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-black mb-2">Bienvenido</h2>
        <p className="text-gray-700">¿Qué deseas hacer hoy?</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Iniciar / Cerrar Turno */}
        <DashboardCard
          to={turnoActual ? '/operador/cerrar-turno' : '/operador/iniciar-turno'}
          icon={turnoActual ? <IconStop /> : <IconPlay />}
          title={turnoActual ? 'Cerrar Turno' : 'Iniciar Turno'}
          subtitle={turnoActual ? 'Finaliza tu jornada laboral' : 'Comienza tu jornada laboral'}
          description={
            turnoActual
              ? 'Registra tu ubicación y cierra el turno'
              : 'Registra el inicio de tu jornada con un toque'
          }
          theme="ecodelivery"
        >
          {turnoActual && (
            <div className="bg-ecodelivery-green/10 rounded-lg p-4 border border-ecodelivery-green/30">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Turno iniciado:</span> {turnoActual.horaInicio}
              </p>
            </div>
          )}
        </DashboardCard>

        {/* Tiempo Real */}
        <DashboardCard
          to="/operador/dashboard/live"
          icon={<IconLive />}
          title="Tiempo Real"
          subtitle="Ver quién está trabajando"
          description="Consulta qué bikers y abejitas tienen turno activo ahora mismo"
          theme="ecodelivery"
        />
      </div>
    </div>
  );
};
