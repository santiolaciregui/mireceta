import mongoose, { Schema, Document, Model } from 'mongoose';
import { NotificationChannel } from '../services/notification/adapters/NotificationAdapter.js';

export interface INotificationConfig extends Document {
  tenantId: string;
  channel: NotificationChannel;
  isEnabled: boolean;
  credentials: Record<string, unknown>;
  settings?: Record<string, unknown>;
  updatedAt: Date;
  createdAt: Date;
}

const notificationConfigSchema = new Schema<INotificationConfig>(
  {
    tenantId: { type: String, required: true, index: true },
    channel: { type: String, required: true, enum: ['email', 'whatsapp'] },
    isEnabled: { type: Boolean, default: true },
    credentials: { type: Schema.Types.Mixed, default: {} },
    settings: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true
  }
);

notificationConfigSchema.index({ tenantId: 1, channel: 1 }, { unique: true });

export const NotificationConfig: Model<INotificationConfig> =
  (mongoose.models.NotificationConfig as any) ||
  mongoose.model<INotificationConfig>('NotificationConfig', notificationConfigSchema);
