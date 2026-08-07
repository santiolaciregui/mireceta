import { AuditLog, IAuditLog } from '../models/AuditLog.js';
import { generateLogId } from '../utils/idGenerator.js';

export class AuditLogRepository {
  async create(logData: Partial<IAuditLog>): Promise<IAuditLog> {
    const log = new AuditLog({
      id: logData.id || generateLogId(),
      timestamp: new Date(),
      ...logData
    });
    return log.save();
  }

  async findByTenant(tenantId: string, limit = 100): Promise<IAuditLog[]> {
    return AuditLog.find({ tenantId }).sort({ timestamp: -1 }).limit(limit);
  }

  async findByEntity(entity: IAuditLog['entity'], entityId: string): Promise<IAuditLog[]> {
    return AuditLog.find({ entity, entityId }).sort({ timestamp: -1 });
  }
}
