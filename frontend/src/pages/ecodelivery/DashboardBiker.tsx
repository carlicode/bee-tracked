import { useState, useEffect } from 'react';
import { DashboardCard } from '../../components/DashboardCard';
import { storage } from '../../services/storage';
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

const IconPlus = () => (
  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const IconBriefcase = () => (
  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const IconClock = () => (
  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const DashboardBiker = () => {
  const [turnoActual, setTurnoActual] = useState<TurnoSimple | null>(null);

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
        <DashboardCard
          to={turnoActual ? '/ecodelivery/cerrar-turno' : '/ecodelivery/iniciar-turno'}
          icon={turnoActual ? <IconStop /> : <IconPlay />}
          title={turnoActual ? 'Cerrar Turno' : 'Iniciar Turno'}
          subtitle={turnoActual ? 'Finaliza tu jornada laboral' : 'Comienza tu jornada laboral'}
          description={
            turnoActual
              ? 'Registra ubicación y cierra tu turno'
              : 'Obtén tu ubicación e inicia tu turno con un toque'
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

        <DashboardCard
          to="/ecodelivery/nuevo-delivery"
          icon={<IconPlus />}
          title="Registrar Delivery"
          subtitle="Registra un delivery realizado"
          description="Registra los detalles del delivery: cliente, origen, destino"
          theme="ecodelivery"
        />

        <DashboardCard
          to="/ecodelivery/mis-deliveries"
          icon={<IconBriefcase />}
          title="Mis Deliveries"
          subtitle="Historial de deliveries"
          description="Revisa todos tus deliveries registrados"
          theme="ecodelivery"
        />

        <DashboardCard
          to="/ecodelivery/mis-turnos"
          icon={<IconClock />}
          title="Mis Turnos"
          subtitle="Historial de turnos"
          description="Revisa inicio y cierre de tus turnos"
          theme="ecodelivery"
        />
      </div>
    </div>
  );
};
