import { useState, useCallback } from 'react';
import { getCurrentPosition, type GeolocationPosition } from '../utils/geolocation';
import { logError } from '../utils/errors';

export interface UseGeolocationReturn {
  location: GeolocationPosition | null;
  loading: boolean;
  error: string | null;
  getLocation: () => Promise<void>;
  clearLocation: () => void;
}

/**
 * Custom hook for geolocation functionality
 */
export const useGeolocation = (): UseGeolocationReturn => {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const position = await getCurrentPosition();
      setLocation(position);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener ubicación';
      setError(errorMessage);
      logError(err, 'useGeolocation');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return {
    location,
    loading,
    error,
    getLocation,
    clearLocation,
  };
};
