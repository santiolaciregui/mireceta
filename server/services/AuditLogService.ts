import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { IAuditLog } from '../models/AuditLog.js';

export interface LogParams {
  tenantId?: string;
  currentUser?: Record<string, any>;
  action: string;
  entity: 'User' | 'Patient' | 'Order' | 'Tenant' | 'Auth';
  entityId?: string;
  details?: string;
  changes?: Record<string, any>;
}

export class AuditLogService {
  private repo: AuditLogRepository;

  constructor() {
    this.repo = new AuditLogRepository();
  }

  async log(params: LogParams): Promise<void> {
    try {
      const tenantId = params.tenantId || params.currentUser?.tenantId || 'TEN-0001';
      const userId = params.currentUser?.id || 'SYSTEM';
      const userName = params.currentUser
        ? `${params.currentUser.name || ''} ${params.currentUser.lastName || ''}`.trim()
        : 'Sistema';
      const userRole = params.currentUser?.role || 'system';

      await this.repo.create({
        tenantId,
        userId,
        userName,
        userRole,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        changes: params.changes
      });
    } catch (err) {
      console.error('AuditLogService log error:', err);
    }
  }

  async getLogsByTenant(tenantId: string, limit = 100): Promise<IAuditLog[]> {
    return this.repo.findByTenant(tenantId, limit);
  }
}

export const auditLogService = new AuditLogService();
