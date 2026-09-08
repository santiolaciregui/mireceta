import { NotificationConfig, INotificationConfig } from '../models/NotificationConfig.js';
import { NotificationChannel } from '../services/notification/adapters/NotificationAdapter.js';

export class NotificationConfigRepository {
  async findByTenantAndChannel(tenantId: string, channel: NotificationChannel): Promise<INotificationConfig | null> {
    return NotificationConfig.findOne({ tenantId, channel });
  }

  async findAllByTenant(tenantId: string): Promise<INotificationConfig[]> {
    return NotificationConfig.find({ tenantId });
  }

  async claimPendingOrderAlert(tenantId: string): Promise<INotificationConfig | null> {
    return NotificationConfig.findOneAndUpdate(
      {
        tenantId,
        channel: 'whatsapp',
        'settings.pendingOrderAlertActive': { $ne: true }
      },
      { $set: { 'settings.pendingOrderAlertActive': true } },
      { new: true }
    );
  }

  async resetPendingOrderAlert(tenantId: string): Promise<void> {
    await NotificationConfig.updateOne(
      { tenantId, channel: 'whatsapp' },
      { $set: { 'settings.pendingOrderAlertActive': false } }
    );
  }

  async upsertConfig(
    tenantId: string,
    channel: NotificationChannel,
    isEnabled: boolean,
    credentials: Record<string, unknown>,
    settings?: Record<string, unknown>
  ): Promise<INotificationConfig> {
    const existing = await this.findByTenantAndChannel(tenantId, channel);
    if (existing) {
      existing.isEnabled = isEnabled;
      existing.credentials = { ...existing.credentials, ...credentials };
      if (settings) existing.settings = { ...existing.settings, ...settings };
      return existing.save();
    }

    const newConfig = new NotificationConfig({
      tenantId,
      channel,
      isEnabled,
      credentials,
      settings: settings || {}
    });
    return newConfig.save();
  }
}
