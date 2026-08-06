import mongoose, { Schema, Document } from 'mongoose';
import { NotificationChannel } from '../services/notification/adapters/NotificationAdapter.js';

export interface INotificationTemplate extends Document {
  tenantId: string;
  code: string; // e.g. 'RECIPE_READY', 'ORDER_CREATED', 'PATIENT_REMINDER'
  name: string;
  channel: NotificationChannel | 'all';
  subject?: string;
  body: string;
  variables: string[]; // e.g. ['patientName', 'orderId', 'recipeUrl']
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    tenantId: { type: String, required: true, index: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    channel: { type: String, required: true, enum: ['email', 'whatsapp', 'all'] },
    subject: { type: String },
    body: { type: String, required: true },
    variables: [{ type: String }],
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

notificationTemplateSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const NotificationTemplate =
  mongoose.models.NotificationTemplate ||
  mongoose.model<INotificationTemplate>('NotificationTemplate', notificationTemplateSchema);
