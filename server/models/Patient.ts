import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  id: string; // PAT-XXXX
  dni: string;
  name: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  obraSocial?: string;
  obraSocialNumber?: string;
  tenantId: string;
  userId?: string; // Reference to User.id credentials account
  status: 'Activo' | 'Inactivo';
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<IPatient>({
  id: { type: String, required: true, unique: true },
  dni: { type: String, required: true },
  name: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  birthDate: { type: String },
  obraSocial: { type: String },
  obraSocialNumber: { type: String },
  tenantId: { type: String, required: true },
  userId: { type: String },
  status: { type: String, enum: ['Activo', 'Inactivo'], default: 'Activo' }
}, {
  timestamps: true
});

patientSchema.index({ tenantId: 1, dni: 1 });

export const Patient = mongoose.models.Patient || mongoose.model<IPatient>('Patient', patientSchema);
