import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export function formatDateTimeInTz(
  isoDateStr: string,
  timeZone: string,
  formatPattern: string = 'EEE, MMM d, yyyy @ h:mm a'
): string {
  try {
    const date = parseISO(isoDateStr);
    return formatInTimeZone(date, timeZone, formatPattern);
  } catch (err) {
    return isoDateStr;
  }
}

export function formatSlotRange(
  startIso: string,
  endIso: string,
  timeZone: string
): string {
  try {
    const start = parseISO(startIso);
    const end = parseISO(endIso);
    const startFormatted = formatInTimeZone(start, timeZone, 'h:mm a');
    const endFormatted = formatInTimeZone(end, timeZone, 'h:mm a');
    return `${startFormatted} – ${endFormatted}`;
  } catch (e) {
    return `${startIso} - ${endIso}`;
  }
}

export function downloadIcsFile(filename: string, content: string): void {
  const element = document.createElement('a');
  const file = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
