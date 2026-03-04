import { useState, useEffect } from 'react';
import { useAuth } from '../../services/auth';
import { turnosApi } from '../../services/turnosApi';
import { DashboardCard } from '../../components/DashboardCard';
import type { Turno } from '../../types/turno';

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

const cardsResto = [
  {
    to: '/beezero/nueva-carrera',
    icon: <IconPlus />,
    title: 'Registrar carrera',
    subtitle: 'Registra una carrera realizada',
    description: 'Registra los detalles de tu carrera: cliente, destino, precio',
  },
  {
    to: '/beezero/mis-carreras',
    icon: <IconBriefcase />,
    title: 'Mis Carreras',
    subtitle: 'Historial de carreras',
    description: 'Revisa todas tus carreras registradas',
  },
  {
    to: '/beezero/mis-turnos',
    icon: <IconClock />,
    title: 'Mis Turnos',
    subtitle: 'Historial de turnos',
    description: 'Revisa inicio y cierre de tus turnos',
  },
];

export const DashboardBeezero = () => {
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const [turnoActual, setTurnoActual] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarTurnoActual = async () => {
      try {
        // Siempre consultar backend primero cuando está habilitado (fuente de verdad)
        if (turnosApi.isEnabled() && user?.driverName) {
          const turno = await turnosApi.getTurnoActivo(user.driverName);
          if (turno) {
            const toSave = { ...turno };
            delete (toSave as Record<string, unknown>).fotoPantalla;
            delete (toSave as Record<string, unknown>).fotoExterior;
            localStorage.setItem('turno_actual', JSON.stringify(toSave));
            setTurnoActual(turno);
            setLoading(false);
            return;
          }
        }

        // Fallback: localStorage (modo demo o backend no disponible)
        const turnoLocal = localStorage.getItem('turno_actual');
        if (turnoLocal) {
          const turno = JSON.parse(turnoLocal) as Turno;
          if (turno?.turnoIniciado && !turno?.turnoCerrado) {
            setTurnoActual(turno);
            setLoading(false);
            return;
          }
        }

        setTurnoActual(null);
      } catch (error) {
        console.error('Error cargando turno actual:', error);
        // Fallback a localStorage si el backend falla
        const turnoLocal = localStorage.getItem('turno_actual');
        if (turnoLocal) {
          try {
            const turno = JSON.parse(turnoLocal) as Turno;
            if (turno?.turnoIniciado && !turno?.turnoCerrado) {
              setTurnoActual(turno);
              setLoading(false);
              return;
            }
          } catch {
            // ignore
          }
        }
        setTurnoActual(null);
      } finally {
        setLoading(false);
      }
    };

    cargarTurnoActual();
  }, [user?.driverName]);

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-black mb-2">Bienvenido</h2>
        <p className="text-gray-700">¿Qué deseas hacer hoy?</p>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-beezero-yellow"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Misma lógica que Eco: mismo lugar muestra Iniciar o Cerrar según haya turno activo */}
        <DashboardCard
          to={turnoActual ? '/beezero/cerrar-turno' : '/beezero/iniciar-turno'}
          icon={turnoActual ? <IconStop /> : <IconPlay />}
          title={turnoActual ? 'Cerrar Turno' : 'Iniciar Turno'}
          subtitle={turnoActual ? 'Finaliza tu jornada laboral' : 'Comienza tu jornada laboral'}
          description={
            turnoActual
              ? 'Registra cierre de caja, QR, fotos finales y más'
              : 'Registra apertura de caja, foto del auto, ubicación y más'
          }
          theme="beezero"
        >
          {turnoActual && turnoActual.horaInicio && (
            <div className="bg-beezero-yellow/20 rounded-lg p-4 border border-beezero-yellow/50">
              <p className="text-sm text-gray-800">
                <span className="font-semibold">Turno iniciado:</span> {turnoActual.horaInicio}
              </p>
            </div>
          )}
        </DashboardCard>

        {!turnoActual && (
          <DashboardCard
            to="/beezero/cerrar-turno"
            icon={<IconStop />}
            title="Cerrar Turno"
            subtitle="Finaliza tu jornada laboral"
            description="Registra cierre de caja, QR, fotos finales y más"
            theme="beezero"
          />
        )}

        {cardsResto.map((card) => (
          <DashboardCard
            key={card.to}
            to={card.to}
            icon={card.icon}
            title={card.title}
            subtitle={card.subtitle}
            description={card.description}
            theme="beezero"
          />
        ))}
      </div>
      )}
    </div>
  );
};
