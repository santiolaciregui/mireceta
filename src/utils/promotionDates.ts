/** US-016: inclusive Argentine calendar dates map to an exclusive server interval. */
const ARGENTINA_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export function promotionDayBoundary(day: string, inclusiveEnd = false): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Ingresá una fecha válida.');
  const start = Date.parse(`${day}T00:00:00-03:00`);
  if (!Number.isFinite(start) || new Date(start - ARGENTINA_OFFSET_MS).toISOString().slice(0, 10) !== day) throw new Error('Ingresá una fecha válida.');
  return new Date(start + (inclusiveEnd ? DAY_MS : 0)).toISOString();
}
export function promotionCalendarDay(instant: string, exclusiveEnd = false): string {
  return new Date(Date.parse(instant) - ARGENTINA_OFFSET_MS - (exclusiveEnd ? 1 : 0)).toISOString().slice(0, 10);
}
