import { useState, useCallback } from 'react';
import { fileToBase64, validateImageFile } from '../utils/image';
import { logError } from '../utils/errors';

export interface UseImageUploadReturn {
  image: string | null;
  loading: boolean;
  error: string | null;
  handleFileChange: (file: File | null) => Promise<void>;
  clearImage: () => void;
}

/**
 * Custom hook for image upload functionality
 */
export const useImageUpload = (): UseImageUploadReturn => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (file: File | null) => {
    if (!file) {
      setImage(null);
      setError(null);
      return;
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Error al validar la imagen');
      setImage(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      setImage(base64);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar la imagen';
      setError(errorMessage);
      setImage(null);
      logError(err, 'useImageUpload');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearImage = useCallback(() => {
    setImage(null);
    setError(null);
  }, []);

  return {
    image,
    loading,
    error,
    handleFileChange,
    clearImage,
  };
};
