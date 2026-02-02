/**
 * Centralized route configuration
 */
export const ROUTES = {
  LOGIN: '/',
  DASHBOARD: '/dashboard',
  NUEVA_CARRERA: '/nueva-carrera',
  INICIAR_TURNO: '/iniciar-turno',
  CERRAR_TURNO: '/cerrar-turno',
  MIS_CARRERAS: '/mis-carreras',
  MIS_TURNOS: '/mis-turnos',
  DETALLE_TURNO: '/turno/:id',
} as const;

export type RouteKey = keyof typeof ROUTES;
