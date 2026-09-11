import { format } from 'date-fns';

/**
 * Formats a date string or Date object to a readable format.
 * Example: 2023-09-01T12:34:56Z => Sep 1, 2023
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '';
  return format(d, 'MMM d, yyyy');
};

/**
 * Formats a date-only string (e.g. YYYY-MM-DD) safely without UTC-to-local day shift.
 */
export const formatBirthDate = (date: string | null | undefined): string => {
  if (!date) return 'Not set';
  const clean = date.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const d = new Date(year, month - 1, day);
      return format(d, 'MMMM d, yyyy');
    }
  }
  return formatDate(date) || 'Not set';
};

