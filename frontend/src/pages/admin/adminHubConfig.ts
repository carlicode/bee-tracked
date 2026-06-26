export type AdminSection = {
  to: string;
  title: string;
  description: string;
  action?: string;
  badgeKey?: 'permisos';
};

export type AdminGroup = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  sections: AdminSection[];
};

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    id: 'operacion',
    title: 'Operación en vivo',
    description: 'Monitorea quién está trabajando ahora y revisa turnos del día.',
    emoji: '📡',
    sections: [
      {
        to: '/admin/dashboard/live',
        title: 'Tiempo real',
        description: 'Quién tiene turno activo ahora (BeeZero y EcoDelivery), con actualización automática.',
      },
      {
        to: '/admin/turnos-beezero',
        title: 'Turnos',
        description: 'Historial de turnos: abejitas (BeeZero) y bikers (EcoDelivery).',
      },
    ],
  },
  {
    id: 'reportes',
    title: 'Carreras y métricas',
    description: 'Consulta carreras, kilometraje y rendimiento por conductor.',
    emoji: '📊',
    sections: [
      {
        to: '/admin/carreras-drivers',
        title: 'Carreras abejitas',
        description: 'Pestaña por abejita (BeeZero), filtros por rango de fechas y resumen de totales.',
      },
      {
        to: '/admin/carreras-bikers',
        title: 'Carreras bikers',
        description: 'Pestaña por biker (EcoDelivery), filtros por rango de fechas y km totales.',
      },
      {
        to: '/admin/rendimiento',
        title: 'Rendimiento',
        description: 'Resumen de carreras por conductor: totales, % con precio y ganancia en Bs.',
      },
      {
        to: '/admin/kilometraje',
        title: 'Kilometraje',
        description: 'Seguimiento de km por biker: registros llenados, pendientes y exportación CSV por mes.',
      },
    ],
  },
  {
    id: 'rrhh',
    title: 'Horarios y asistencia',
    description: 'Calendarios, permisos, asistencia y multas del equipo.',
    emoji: '📅',
    sections: [
      {
        to: '/admin/calendarios',
        title: 'Horarios de trabajo',
        description: 'Habilita ventanas, revisa envíos y edita horarios oficiales.',
      },
      {
        to: '/admin/extraordinarios',
        title: 'Días extraordinarios',
        description: 'Feriados u operaciones especiales con inscripción previa.',
      },
      {
        to: '/admin/asistencia',
        title: 'Asistencia',
        description: 'Compara calendario vs turnos reales y exporta reportes.',
      },
      {
        to: '/admin/multas',
        title: 'Multas',
        description: 'Multas automáticas por tardanza o ausencia, con reglas configurables.',
      },
      {
        to: '/admin/permisos',
        title: 'Permisos',
        description: 'Aprueba o rechaza solicitudes de días libre de drivers y bikers.',
        badgeKey: 'permisos',
      },
    ],
  },
  {
    id: 'comunicacion',
    title: 'Comunicación',
    description: 'Anuncios y mensajes para el equipo.',
    emoji: '📢',
    sections: [
      {
        to: '/admin/anuncios/crear',
        title: 'Crear anuncio',
        description: 'Publica un mensaje para abejitas, bikers o todos. Lo verán al iniciar sesión.',
        action: 'Crear →',
      },
      {
        to: '/admin/anuncios',
        title: 'Anuncios',
        description: 'Ver anuncios activos, quién los leyó y eliminarlos si hace falta.',
      },
    ],
  },
  {
    id: 'plataforma',
    title: 'Plataforma',
    description: 'Usuarios, accesos y configuración general.',
    emoji: '⚙️',
    sections: [
      {
        to: '/admin/usuarios',
        title: 'Usuarios',
        description: 'Ver y dar de alta usuarios de la plataforma (drivers, bikers, admins).',
      },
      {
        to: '/admin/onboarding',
        title: 'Primer inicio de app',
        description: 'Ver quién completó el tutorial de bienvenida y resetear a primer inicio si hace falta.',
      },
    ],
  },
];

export function getAdminGroup(id: string): AdminGroup | undefined {
  return ADMIN_GROUPS.find((g) => g.id === id);
}

export function getGroupForPath(path: string): AdminGroup | undefined {
  const normalized = path.split('?')[0];
  return ADMIN_GROUPS.find((g) =>
    g.sections.some((s) => normalized === s.to || normalized.startsWith(`${s.to}/`))
  );
}
