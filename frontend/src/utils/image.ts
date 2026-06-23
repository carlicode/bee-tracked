/**
 * Image utilities
 */
import { APP_CONFIG, ERROR_MESSAGES } from '../config/constants';

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.85;

function estimateBase64Bytes(dataUrl: string): number {
  const base64Part = dataUrl.split(',')[1] || '';
  return (base64Part.length * 3) / 4;
}

/**
 * Convert file to base64 string (sin límite de tamaño — la compresión va después).
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
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
 */
export async function compressImage(dataUrl: string, maxSizeMB = 0.8): Promise<string> {
  const maxBytes = maxSizeMB * 1024 * 1024;
  const estimatedBytes = estimateBase64Bytes(dataUrl);

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

      while (quality > 0.35) {
        const bytes = estimateBase64Bytes(result);
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
 * Validate image file type and optional input size (before compression).
 */
export const validateImageFile = (
  file: File | undefined,
  options: { checkInputSize?: boolean } = {}
): { valid: boolean; error?: string } => {
  const { checkInputSize = true } = options;

  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo' };
  }

  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'El archivo debe ser una imagen' };
  }

  if (checkInputSize && file.size > APP_CONFIG.MAX_INPUT_IMAGE_SIZE) {
    return { valid: false, error: ERROR_MESSAGES.IMAGE_INPUT_TOO_LARGE };
  }

  return { valid: true };
};

/**
 * Read and compress a file in one step (for forms and hooks).
 * Acepta fotos grandes de cámara y las comprime antes de subir.
 */
export async function fileToCompressedBase64(file: File): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Imagen inválida');
  }

  const raw = await fileToBase64(file);
  const targetMB = APP_CONFIG.MAX_COMPRESSED_IMAGE_SIZE / (1024 * 1024);
  let compressed = await compressImage(raw, targetMB);

  if (estimateBase64Bytes(compressed) > APP_CONFIG.MAX_COMPRESSED_IMAGE_SIZE) {
    compressed = await compressImage(raw, targetMB / 2);
  }

  if (estimateBase64Bytes(compressed) > APP_CONFIG.MAX_COMPRESSED_IMAGE_SIZE) {
    throw new Error(ERROR_MESSAGES.IMAGE_TOO_LARGE);
  }

  return compressed;
}
