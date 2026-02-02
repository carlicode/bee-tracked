/**
 * Formatting utilities
 */

export const formatters = {
  /**
   * Format date to YYYY-MM-DD
   */
  dateToInput: (date: Date): string => {
    return date.toISOString().split('T')[0];
  },

  /**
   * Format time to HH:MM
   */
  timeToInput: (date: Date): string => {
    return date.toTimeString().slice(0, 5);
  },

  /**
   * Format currency (Bolivianos)
   */
  currency: (amount: number): string => {
    return `Bs ${amount.toFixed(2)}`;
  },

  /**
   * Format date for display
   */
  formatDate: (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  },

  /**
   * Format datetime for display
   */
  formatDateTime: (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  },
};
