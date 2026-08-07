import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  id: string;
  tenantId: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entity: 'User' | 'Patient' | 'Order' | 'Tenant' | 'Auth';
  entityId?: string;
  details?: string;
  changes?: Record<string, any>;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  userId: { type: String },
  userName: { type: String },
  userRole: { type: String },
  action: { type: String, required: true },
  entity: { type: String, enum: ['User', 'Patient', 'Order', 'Tenant', 'Auth'], required: true },
  entityId: { type: String },
  details: { type: String },
  changes: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

export const AuditLog: Model<IAuditLog> = (mongoose.models.AuditLog as any) || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
