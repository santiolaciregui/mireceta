import { NotificationTemplate, INotificationTemplate } from '../models/NotificationTemplate.js';
import { NotificationChannel } from '../services/notification/adapters/NotificationAdapter.js';

export class NotificationTemplateRepository {
  async findByTenantAndCode(tenantId: string, code: string): Promise<INotificationTemplate | null> {
    return (NotificationTemplate as any).findOne({ tenantId, code: code.toUpperCase() });
  }

  async findAllByTenant(tenantId: string): Promise<INotificationTemplate[]> {
    return (NotificationTemplate as any).find({ tenantId }).sort({ name: 1 });
  }

  async upsertTemplate(
    tenantId: string,
    templateData: {
      code: string;
      name: string;
      channel: NotificationChannel | 'all';
      subject?: string;
      body: string;
      variables?: string[];
      isActive?: boolean;
    }
  ): Promise<INotificationTemplate> {
    const code = templateData.code.toUpperCase();
    const existing = await this.findByTenantAndCode(tenantId, code);

    if (existing) {
      existing.name = templateData.name;
      existing.channel = templateData.channel;
      existing.subject = templateData.subject;
      existing.body = templateData.body;
      existing.variables = templateData.variables || existing.variables;
      if (templateData.isActive !== undefined) existing.isActive = templateData.isActive;
      return existing.save();
    }

    const newTemplate = new NotificationTemplate({
      tenantId,
      code,
      name: templateData.name,
      channel: templateData.channel,
      subject: templateData.subject,
      body: templateData.body,
      variables: templateData.variables || [],
      isActive: templateData.isActive ?? true
    });
    return newTemplate.save();
  }

  async deleteByCode(tenantId: string, code: string): Promise<boolean> {
    const res = await (NotificationTemplate as any).deleteOne({ tenantId, code: code.toUpperCase() });
    return res.deletedCount > 0;
  }
}
