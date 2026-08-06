import mongoose, { Schema, Document } from 'mongoose';
import { NotificationChannel } from '../services/notification/adapters/NotificationAdapter.js';

export interface INotificationLog extends Document {
  tenantId: string;
  recipient: string;
  channel: NotificationChannel;
  templateCode?: string;
  subject?: string;
  body: string;
  status: 'sent' | 'failed' | 'pending';
  messageId?: string;
  error?: string;
  variablesUsed?: Record<string, unknown>;
  sentAt: Date;
  createdAt: Date;
}

const notificationLogSchema = new Schema<INotificationLog>(
  {
    tenantId: { type: String, required: true, index: true },
    recipient: { type: String, required: true },
    channel: { type: String, required: true, enum: ['email', 'whatsapp'] },
    templateCode: { type: String },
    subject: { type: String },
    body: { type: String, required: true },
    status: { type: String, required: true, enum: ['sent', 'failed', 'pending'] },
    messageId: { type: String },
    error: { type: String },
    variablesUsed: { type: Schema.Types.Mixed },
    sentAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

notificationLogSchema.index({ tenantId: 1, sentAt: -1 });

export const NotificationLog =
  mongoose.models.NotificationLog ||
  mongoose.model<INotificationLog>('NotificationLog', notificationLogSchema);
