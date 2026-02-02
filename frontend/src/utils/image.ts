/**
 * Image utilities
 */
import { APP_CONFIG, ERROR_MESSAGES } from '../config/constants';

/**
 * Convert file to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Validate file size
    if (file.size > APP_CONFIG.MAX_IMAGE_SIZE) {
      reject(new Error(ERROR_MESSAGES.IMAGE_TOO_LARGE));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error('Error al leer la imagen'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Validate image file
 */
export const validateImageFile = (file: File | undefined): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo' };
  }

  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'El archivo debe ser una imagen' };
  }

  if (file.size > APP_CONFIG.MAX_IMAGE_SIZE) {
    return { valid: false, error: ERROR_MESSAGES.IMAGE_TOO_LARGE };
  }

  return { valid: true };
};
