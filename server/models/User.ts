import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  id: string; // USR-XXXX
  name: string;
  lastName: string;
  role: 'paciente' | 'medico' | 'admin' | 'colaborador';
  identifier: string; // DNI, Matrícula, Username
  email: string;
  status: 'Activo' | 'Inactivo';
  password?: string;
  medicoId?: string; // If 'colaborador', which doctor is this linked to
  medicoName?: string; // Friendly name of the doctor
  phone?: string;
  city?: string;
  province?: string;
  tenantId?: string; // Temporarily optional for the DB schema so we can migrate
  birthDate?: string;
  obraSocial?: string;
  obraSocialNumber?: string;
  dependents?: any[];
  requirePasswordChange?: boolean;
  rate?: number; // Custom rate per prescription for this professional
  // Password reset flow
  resetToken?: string;
  resetTokenExp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['paciente', 'medico', 'admin', 'colaborador'], required: true },
  identifier: { type: String, required: true, unique: true },
  email: { type: String, required: false },
  status: { type: String, enum: ['Activo', 'Inactivo'], default: 'Activo' },
  password: { type: String },
  medicoId: { type: String },
  medicoName: { type: String },
  tenantId: { type: String },
  phone: { type: String },
  city: { type: String },
  province: { type: String },
  birthDate: { type: String },
  obraSocial: { type: String },
  obraSocialNumber: { type: String },
  dependents: { type: Schema.Types.Mixed, default: [] },
  requirePasswordChange: { type: Boolean, default: false },
  rate: { type: Number },
  resetToken: { type: String },
  resetTokenExp: { type: Date }
}, {
  timestamps: true, 
});

export const User: Model<IUser> = (mongoose.models.User as any) || mongoose.model<IUser>('User', userSchema);
