/**
 * File: activityOrdering.ts
 * Task: US-006 / T-001
 * Date: 2026-09-16
 * Decisions: Treat missing or invalid dates as no activity and compare every source by its actual timestamp.
 */

export type ActivityTimestamp = string | Date | null | undefined;

export function getActivityTime(value: ActivityTimestamp): number {
  if (!value) return 0;

  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

export function getLatestActivityTimestamp(...values: ActivityTimestamp[]): string {
  let latestTimestamp = '';
  let latestTime = 0;

  for (const value of values) {
    const time = getActivityTime(value);
    if (time > latestTime) {
      latestTime = time;
      latestTimestamp = value instanceof Date ? value.toISOString() : value || '';
    }
  }

  return latestTimestamp;
}

export function compareActivityTimestampsDesc(
  first: ActivityTimestamp,
  second: ActivityTimestamp
): number {
  return getActivityTime(second) - getActivityTime(first);
}
