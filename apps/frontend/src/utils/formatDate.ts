/**
 * Formats a date as mm/dd/yyyy, the date format shown across the app.
 *
 * @param date - The date to format.
 * @returns The formatted date, e.g. "10/14/2026".
 */
export const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });