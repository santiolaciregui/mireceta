/**
 * File: orderInbox.ts
 * Task: US-007 / T-001
 * Date: 2026-09-16
 * Decisions: Sort a copied list by creation time and use the order ID as a deterministic fallback.
 */

import { ActivityTimestamp, getActivityTime } from './activityOrdering';

export interface OrderInboxItem {
  id: string;
  createdAt?: ActivityTimestamp;
}

export function sortOrdersNewestFirst<T extends OrderInboxItem>(orders: readonly T[]): T[] {
  return [...orders].sort((first, second) => {
    const timeDifference = getActivityTime(second.createdAt) - getActivityTime(first.createdAt);

    if (timeDifference !== 0) return timeDifference;

    return first.id.localeCompare(second.id, 'es-AR', { sensitivity: 'base' });
  });
}

export function formatOrderCreatedAt(value: ActivityTimestamp): string {
  const time = getActivityTime(value);
  if (!time) return 'Fecha no disponible';

  return new Date(time).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
