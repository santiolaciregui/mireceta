import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITenant extends Document {
  id: string;
  name: string;
  subdomain: string;
  mpAccessToken?: string;
  mpPublicKey?: string;
  mpEnabled?: boolean;
  firstRequestPromotionEnabled?: boolean;
  firstRequestPromotionStartsAt?: string;
  firstRequestPromotionEndsAt?: string;
  pricePerPrescription?: number;
  collaboratorRate?: number;
  doctorRate?: number;
  settlementBasis?: 'emitted' | 'all';
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  subdomain: { type: String, required: true, unique: true },
  mpAccessToken: { type: String },
  mpPublicKey: { type: String },
  mpEnabled: { type: Boolean, default: false },
  firstRequestPromotionEnabled: { type: Boolean, default: false },
  firstRequestPromotionStartsAt: { type: String, default: "2026-11-10T03:00:00.000Z" },
  firstRequestPromotionEndsAt: { type: String, default: "2026-12-16T03:00:00.000Z" },
  pricePerPrescription: { type: Number, default: 10000 },
  collaboratorRate: { type: Number, default: 500 },
  doctorRate: { type: Number, default: 1500 },
  settlementBasis: { type: String, enum: ['emitted', 'all'], default: 'emitted' }
}, {
  timestamps: true
});

export const Tenant: Model<ITenant> = (mongoose.models.Tenant as any) || mongoose.model<ITenant>('Tenant', tenantSchema);
