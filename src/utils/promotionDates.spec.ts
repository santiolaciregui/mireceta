/** US-016: dates are inclusive in Argentina, independent of the browser timezone. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { promotionDayBoundary, promotionCalendarDay } from './promotionDates';
test('a start date begins at midnight Argentina, exactly 03:00 UTC', () => {
  assert.equal(promotionDayBoundary('2026-11-10'), '2026-11-10T03:00:00.000Z');
});
test('an inclusive end date ends at the next midnight Argentina', () => {
  assert.equal(promotionDayBoundary('2026-12-15', true), '2026-12-16T03:00:00.000Z');
});
test('a one-day promotion maps to a full 24-hour interval', () => {
  assert.equal(Date.parse(promotionDayBoundary('2026-12-15', true)) - Date.parse(promotionDayBoundary('2026-12-15')), 86400000);
});
test('calendar fields round-trip without moving to the previous or following date', () => {
  for (const day of ['2026-11-10', '2026-12-31', '2028-02-29']) {
    assert.equal(promotionCalendarDay(promotionDayBoundary(day)), day);
    assert.equal(promotionCalendarDay(promotionDayBoundary(day, true), true), day);
  }
});
test('rejects missing, malformed and nonexistent calendar dates', () => {
  for (const day of ['', '15/12/2026', '2026-02-29', '2026-02-30', '2026-13-01', '2026-12-00']) assert.throws(() => promotionDayBoundary(day), /fecha válida/);
});
