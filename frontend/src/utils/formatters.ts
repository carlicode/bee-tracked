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
   * Format time to HH:mm (sin segundos). Uso consistente en toda la app.
   */
  timeToHHmm: (date: Date): string => {
    return date.toTimeString().slice(0, 5);
  },

  /**
   * @deprecated Use timeToHHmm
   */
  timeToInput: (date: Date): string => {
    return date.toTimeString().slice(0, 5);
  },

  /**
   * Para mostrar en UI: siempre HH:mm (quita segundos si vienen).
   */
  formatHoraDisplay: (hora: string | undefined): string => {
    const n = formatters.normalizeHoraHHmm(hora);
    return n || (hora ? String(hora) : '') || '';
  },

  /**
   * Normaliza un string de hora a HH:mm (quita segundos si vienen).
   */
  normalizeHoraHHmm: (hora: string | undefined): string => {
    if (!hora || typeof hora !== 'string') return '';
    const match = hora.trim().match(/^(\d{1,2}):(\d{1,2})/);
    if (!match) return '';
    const h = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    const hNum = parseInt(h, 10);
    const mNum = parseInt(m, 10);
    if (hNum > 23 || mNum > 59) return '';
    return `${h}:${m}`;
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
