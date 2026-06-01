/**
 * Image utilities
 */
import { APP_CONFIG, ERROR_MESSAGES } from '../config/constants';

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.85;

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
 * Compress a base64 data URL (max width 1920px, JPEG quality 0.85).
 * Returns original if already small enough.
 */
export async function compressImage(dataUrl: string, maxSizeMB = 0.8): Promise<string> {
  const maxBytes = maxSizeMB * 1024 * 1024;

  // Estimate size from base64 length; skip if already under target
  const base64Part = dataUrl.split(',')[1] || '';
  const estimatedBytes = (base64Part.length * 3) / 4;
  if (estimatedBytes <= maxBytes && !dataUrl.includes('data:image/jpeg')) {
    // Still resize if dimensions exceed max width
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width <= MAX_WIDTH && estimatedBytes <= maxBytes) {
        resolve(dataUrl);
        return;
      }

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      let quality = JPEG_QUALITY;
      let result = canvas.toDataURL('image/jpeg', quality);

      // Reduce quality iteratively if still too large
      while (quality > 0.4) {
        const part = result.split(',')[1] || '';
        const bytes = (part.length * 3) / 4;
        if (bytes <= maxBytes) break;
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }

      resolve(result);
    };
    img.onerror = () => reject(new Error('Error al comprimir la imagen'));
    img.src = dataUrl;
  });
}

/**
 * Read and compress a file in one step (for forms and hooks).
 */
export async function fileToCompressedBase64(file: File): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Imagen inválida');
  }
  const raw = await fileToBase64(file);
  return compressImage(raw);
}

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
