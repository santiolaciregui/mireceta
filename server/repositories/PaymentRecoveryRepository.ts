/** Durable batch progress in the existing audit collection; no new schema. */
import { AuditLog } from '../models/AuditLog.js';
import { AuditLogRepository } from './AuditLogRepository.js';

const ACTION = 'PAYMENT_RECOVERY_CHECKPOINT';
export class PaymentRecoveryRepository {
  async read(): Promise<string | undefined> {
    const entry = await AuditLog.findOne({ tenantId: 'SYSTEM-PAYMENTS', action: ACTION })
      .sort({ timestamp: -1, _id: -1 }).select('changes').lean();
    const cursor = entry?.changes?.nextOrderId;
    return typeof cursor === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(cursor) ? cursor : undefined;
  }

  async save(nextOrderId: string | undefined, summary: Record<string, number>) {
    // Unlike best-effort telemetry, failed checkpoint persistence must reach the caller.
    await new AuditLogRepository().create({
      tenantId: 'SYSTEM-PAYMENTS', userId: 'SYSTEM', userRole: 'system', entity: 'Order',
      action: ACTION, details: 'Scheduled payment recovery batch',
      changes: { nextOrderId: nextOrderId || null, ...summary },
    });
  }
}
