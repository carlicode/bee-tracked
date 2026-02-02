/**
 * Geolocation utilities
 */
import { APP_CONFIG, ERROR_MESSAGES } from '../config/constants';

export interface GeolocationPosition {
  lat: number;
  lng: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

/**
 * Get current geolocation position
 */
export const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: -1,
        message: ERROR_MESSAGES.GEOLOCATION_NOT_AVAILABLE,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error: GeolocationPositionError) => {
        reject({
          code: error.code,
          message: ERROR_MESSAGES.GEOLOCATION_ERROR,
        });
      },
      APP_CONFIG.GEOLOCATION_OPTIONS
    );
  });
};
