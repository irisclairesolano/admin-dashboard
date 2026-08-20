import { format } from 'date-fns';

/**
 * Formats a date string or Date object to a readable format.
 * Example: 2023-09-01T12:34:56Z => Sep 1, 2023
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return format(d, 'MMM d, yyyy');
};
