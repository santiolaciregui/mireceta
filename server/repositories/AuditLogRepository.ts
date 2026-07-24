import { AuditLog, IAuditLog } from '../models/AuditLog.js';

export class AuditLogRepository {
  async create(logData: Partial<IAuditLog>) {
    const log = new AuditLog({
      id: logData.id || `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date(),
      ...logData
    });
    return log.save();
  }

  async findByTenant(tenantId: string, limit = 100) {
    return (AuditLog as any).find({ tenantId }).sort({ timestamp: -1 }).limit(limit);
  }

  async findByEntity(entity: string, entityId: string) {
    return (AuditLog as any).find({ entity, entityId }).sort({ timestamp: -1 });
  }
}
