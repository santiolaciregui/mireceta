import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITenant extends Document {
  id: string;
  name: string;
  subdomain: string;
  mpAccessToken?: string;
  mpPublicKey?: string;
  mpEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  subdomain: { type: String, required: true, unique: true },
  mpAccessToken: { type: String },
  mpPublicKey: { type: String },
  mpEnabled: { type: Boolean, default: false }
}, {
  timestamps: true
});

export const Tenant: Model<ITenant> = (mongoose.models.Tenant as any) || mongoose.model<ITenant>('Tenant', tenantSchema);
