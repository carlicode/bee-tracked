import { useState } from 'react';
import type { UserType } from '../types';

interface TutorialStep {
  title: string;
  body: string;
  icon: React.ReactNode;
  visual?: React.ReactNode;
}

interface TutorialModalProps {
  userType: UserType;
  onComplete: () => void;
}

const IconWave = () => (
  <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
  </svg>
);

const IconPlay = () => (
  <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconPlus = () => (
  <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m6-6H6" />
  </svg>
);

const IconStop = () => (
  <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
);

const IconChart = () => (
  <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconLive = () => (
  <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const IconCalendar = () => (
  <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const IconMegaphone = () => (
  <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
  </svg>
);

const IconEye = () => (
  <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

function getSteps(userType: UserType): TutorialStep[] {
  switch (userType) {
    case 'ecodelivery':
    case 'operador':
      return [
        {
          title: '¡Bienvenido a Bee Tracked!',
          body: 'Esta app registra tus turnos de trabajo. Por ahora solo tienes que hacer dos cosas: abrir tu turno al comenzar y cerrarlo al terminar. ¡Así de simple!',
          icon: <IconWave />,
        },
        {
          title: 'Cómo iniciar tu turno',
          body: 'Toca "Iniciar Turno" en el panel. La app pedirá acceso a tu ubicación — acéptalo. Si trabajas en Hillu, también deberás tomar una foto con la cámara.',
          icon: <IconPlay />,
        },
        {
          title: 'Cómo cerrar tu turno',
          body: 'Cuando termines tu jornada, toca "Cerrar Turno". Es muy importante que lo hagas antes de irte. Así el equipo sabe que terminaste.',
          icon: <IconStop />,
        },
        {
          title: 'Cierra la app cuando termines',
          body: 'Cada vez que dejes de usar la app, toca el botón "Salir" que está arriba a la derecha. Esto evita problemas con tu turno.',
          icon: <IconPlay />,
          visual: (
            <div className="mt-4 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
              <div className="bg-ecodelivery-green px-4 py-2 flex justify-between items-center">
                <span className="text-white font-bold text-sm">bee-tracked</span>
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-xs">?</span>
                  <span className="bg-white text-ecodelivery-green text-xs font-bold px-2 py-1 rounded-lg ring-2 ring-white animate-pulse">
                    Salir
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-2 flex justify-end">
                <div className="flex flex-col items-end gap-0.5">
                  <svg className="w-5 h-5 text-ecodelivery-green animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span className="text-xs text-ecodelivery-green font-semibold">¡Toca acá!</span>
                </div>
              </div>
            </div>
          ),
        },
      ];
    case 'admin':
    case 'rrhh':
      return [
        {
          title: userType === 'rrhh' ? '¡Bienvenida, Andi!' : '¡Bienvenido al panel admin!',
          body: userType === 'rrhh'
            ? 'Desde aquí puedes publicar anuncios para abejitas y bikers, y ver quién los leyó.'
            : 'Panel central para ver carreras, turnos en tiempo real, permisos y anuncios de todo el equipo.',
          icon: <IconWave />,
        },
        {
          title: userType === 'rrhh' ? 'Cómo crear un anuncio' : 'Ver carreras de tus drivers',
          body: userType === 'rrhh'
            ? 'Ve a "Crear anuncio", escribe título y mensaje, elige audiencia (abejitas, bikers o todos) y publica.'
            : 'En "Carreras abejitas" y "Carreras bikers" puedes filtrar por fechas y ver el detalle por persona.',
          icon: userType === 'rrhh' ? <IconMegaphone /> : <IconChart />,
        },
        {
          title: userType === 'rrhh' ? 'Cómo ver quién leyó el anuncio' : 'Ver turnos activos en tiempo real',
          body: userType === 'rrhh'
            ? 'En "Anuncios" puedes ver la lista de anuncios activos y expandir las estadísticas de lectura.'
            : 'En "Tiempo real" ves quién tiene turno activo ahora en BeeZero y EcoDelivery, con actualización automática.',
          icon: userType === 'rrhh' ? <IconEye /> : <IconLive />,
        },
        ...(userType === 'admin'
          ? [
              {
                title: 'Gestionar permisos',
                body: 'En "Permisos" aprueba o rechaza solicitudes de días libre. Las solicitudes pendientes aparecen con un badge rojo.',
                icon: <IconCalendar />,
              },
            ]
          : []),
      ];
    default:
      return [
        {
          title: '¡Bienvenido a Bee Tracked!',
          body: 'Esta app registra tus turnos de trabajo. Por ahora solo tenés que hacer dos cosas: abrir tu turno al comenzar y cerrarlo al terminar. ¡Así de simple!',
          icon: <IconWave />,
        },
        {
          title: 'Cómo iniciar tu turno',
          body: 'Desde el panel principal, toca "Iniciar Turno". Completá los datos, registrá las fotos y confirmá. Tu jornada queda guardada automáticamente.',
          icon: <IconPlay />,
        },
        {
          title: 'Cómo cerrar tu turno',
          body: 'Al terminar tu jornada, toca "Cerrar Turno". Completá el cierre y las fotos finales. Es muy importante que lo hagas antes de irte.',
          icon: <IconStop />,
        },
        {
          title: 'Cerrá la app cuando termines',
          body: 'Cada vez que dejes de usar la app, tocá el botón "Salir" que está arriba a la derecha. Esto evita problemas con tu turno.',
          icon: <IconPlay />,
          visual: (
            <div className="mt-4 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
              <div className="bg-beezero-yellow px-4 py-2 flex justify-between items-center">
                <span className="text-black font-bold text-sm">bee-tracked</span>
                <div className="flex items-center gap-3">
                  <span className="text-black/40 text-xs">?</span>
                  <span className="bg-black text-beezero-yellow text-xs font-bold px-2 py-1 rounded-lg ring-2 ring-black animate-pulse">
                    Salir
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-2 flex justify-end">
                <div className="flex flex-col items-end gap-0.5">
                  <svg className="w-5 h-5 text-yellow-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span className="text-xs text-yellow-600 font-semibold">¡Toca acá!</span>
                </div>
              </div>
            </div>
          ),
        },
      ];
  }
}

function themeFor(userType: UserType) {
  if (userType === 'admin' || userType === 'rrhh') {
    return {
      accent: 'bg-beeadmin-purple',
      accentHover: 'hover:bg-beeadmin-purple-dark',
      progress: 'bg-beeadmin-purple',
      iconBg: 'bg-violet-100 text-beeadmin-purple',
      textBtn: 'text-white',
    };
  }
  if (userType === 'ecodelivery' || userType === 'operador') {
    return {
      accent: 'bg-ecodelivery-green',
      accentHover: 'hover:bg-green-600',
      progress: 'bg-ecodelivery-green',
      iconBg: 'bg-green-100 text-ecodelivery-green',
      textBtn: 'text-white',
    };
  }
  return {
    accent: 'bg-beezero-yellow',
    accentHover: 'hover:bg-yellow-400',
    progress: 'bg-beezero-yellow',
    iconBg: 'bg-yellow-100 text-yellow-700',
    textBtn: 'text-black',
  };
}

export function TutorialModal({ userType, onComplete }: TutorialModalProps) {
  const steps = getSteps(userType);
  const [step, setStep] = useState(0);
  const theme = themeFor(userType);
  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Paso {step + 1} de {steps.length}
          </p>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${theme.progress} transition-all duration-300`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="px-6 py-6 text-center">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 ${theme.iconBg}`}>
            {current.icon}
          </div>
          <h2 id="tutorial-title" className="text-xl font-bold text-gray-900 mb-3">
            {current.title}
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">{current.body}</p>
          {current.visual && <div className="mt-2">{current.visual}</div>}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {!isFirst && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Anterior
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (isLast) onComplete();
              else setStep((s) => s + 1);
            }}
            className={`flex-1 py-3 rounded-xl font-semibold transition ${theme.accent} ${theme.accentHover} ${theme.textBtn}`}
          >
            {isLast ? 'Entendido' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
