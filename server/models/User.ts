import mongoose, { Schema, Document } from 'mongoose';

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
  tenantId?: string; // Temporarily optional for the DB schema so we can migrate
  birthDate?: string;
  obraSocial?: string;
  obraSocialNumber?: string;
  dependents?: any[];
  requirePasswordChange?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['paciente', 'medico', 'admin', 'colaborador'], required: true },
  identifier: { type: String, required: true, unique: true }, // DNI, Matrícula, Username
  email: { type: String, required: false },
  status: { type: String, enum: ['Activo', 'Inactivo'], default: 'Activo' },
  password: { type: String },
  
  // Campos específicos para 'colaborador'
  medicoId: { type: String }, // Storing the string ID to match old logic, though ObjectId is better long term
  medicoName: { type: String },
  tenantId: { type: String }, // Populated during migration and required for new users
  
  // Campos específicos para pacientes
  phone: { type: String },
  birthDate: { type: String },
  obraSocial: { type: String },
  obraSocialNumber: { type: String },
  dependents: { type: Schema.Types.Mixed, default: [] },

  // Seguridad
  requirePasswordChange: { type: Boolean, default: true }
}, {
  timestamps: true, 
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
