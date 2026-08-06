import { NotificationLog, INotificationLog } from '../models/NotificationLog.js';

export class NotificationLogRepository {
  async createLog(logData: Partial<INotificationLog>): Promise<INotificationLog> {
    const newLog = new NotificationLog(logData);
    return newLog.save();
  }

  async findLogsByTenant(tenantId: string, limit: number = 50): Promise<INotificationLog[]> {
    return (NotificationLog as any).find({ tenantId }).sort({ sentAt: -1 }).limit(limit);
  }
}
