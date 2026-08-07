import { IMedicalOrder, IAuditLogEntry } from '../models/Order.js';

/**
 * Appends an entry to an order's auditLog array cleanly.
 */
export function addAuditLogEntry(
  order: Partial<IMedicalOrder> & { auditLog?: IAuditLogEntry[] },
  action: string,
  user: string,
  notes?: string
): void {
  if (!order.auditLog) {
    order.auditLog = [];
  }
  order.auditLog.push({
    action,
    user,
    timestamp: new Date().toISOString(),
    notes
  });
}
