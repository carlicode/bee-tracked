/**
 * Error handling utilities
 */

export interface AppError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Create a standardized error object
 */
export const createError = (message: string, code?: string, status?: number): AppError => {
  return { message, code, status };
};

/**
 * Extract error message from various error types
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, any>;
    if (err.message) {
      return String(err.message);
    }
    if (err.error) {
      return String(err.error);
    }
  }

  return 'Ocurrió un error desconocido';
};

/**
 * Log error to console (can be extended to send to error tracking service)
 */
export const logError = (error: unknown, context?: string): void => {
  const message = getErrorMessage(error);
  const logMessage = context ? `[${context}] ${message}` : message;
  console.error(logMessage, error);
};
