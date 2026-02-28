/**
 * Application constants
 */
export const APP_CONFIG = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  GEOLOCATION_TIMEOUT: 10000, // 10 seconds
  GEOLOCATION_OPTIONS: {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  },
  STORAGE_KEYS: {
    TOKEN: 'eco_drivers_token',
    USER: 'eco_drivers_user',
    TURNO_ACTUAL: 'turno_actual',
    MOCK_CARRERAS: 'mock_carreras',
    SESSION_ID: 'eco_drivers_session_id',
    REFRESH_TOKEN: 'eco_drivers_refresh_token',
    USERNAME: 'eco_drivers_username',
  },
} as const;

export const ERROR_MESSAGES = {
  REQUIRED_FIELDS: 'Por favor completa todos los campos requeridos',
  SESSION_EXPIRED: 'Sesión expirada. Por favor inicia sesión nuevamente.',
  GEOLOCATION_NOT_AVAILABLE: 'La geolocalización no está disponible en tu dispositivo',
  GEOLOCATION_ERROR: 'Error al obtener la ubicación. Asegúrate de permitir el acceso a la ubicación.',
  IMAGE_TOO_LARGE: 'La imagen es muy grande. Máximo 5MB',
  GENERIC_ERROR: 'Ocurrió un error. Por favor intenta nuevamente.',
} as const;

export const SUCCESS_MESSAGES = {
  CARRERA_CREADA: 'Carrera registrada exitosamente',
  TURNO_INICIADO: 'Turno iniciado exitosamente',
  TURNO_CERRADO: 'Turno cerrado exitosamente',
} as const;

/** Placas de autos disponibles para conductores BeeZero (Abejita). Formato: número + espacio + letras. Orden alfabético. */
export const PLACAS_AUTO_ABEJITA = [
  '6265 LYR',
  '6265 LUH',
  '6419 DKG',
  '6419 DLK',
  '6422 DLK',
  '6423 DLK',
  '6430 CKX',
  '6445 SLA',
  '6788 GXD',
  '6788 NRT',
] as const;
