import { AuditLogRepository } from '../repositories/AuditLogRepository.js';

export class AuditLogService {
  private repo: AuditLogRepository;

  constructor() {
    this.repo = new AuditLogRepository();
  }

  async log(params: {
    tenantId: string;
    currentUser?: any;
    action: string;
    entity: 'User' | 'Patient' | 'Order' | 'Tenant' | 'Auth';
    entityId?: string;
    details?: string;
    changes?: Record<string, any>;
  }) {
    try {
      await this.repo.create({
        tenantId: params.tenantId || params.currentUser?.tenantId || 'TEN-0001',
        userId: params.currentUser?.id || 'SYSTEM',
        userName: params.currentUser ? `${params.currentUser.name} ${params.currentUser.lastName}` : 'Sistema',
        userRole: params.currentUser?.role || 'system',
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        changes: params.changes,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('AuditLogService log error:', err);
    }
  }

  async getLogsByTenant(tenantId: string, limit = 100) {
    return this.repo.findByTenant(tenantId, limit);
  }
}

export const auditLogService = new AuditLogService();
