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
  messages?: any[];
  lastPatientWhatsAppInteractionAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const patientChatMessageSchema = new Schema({
  id: { type: String, required: true },
  sender: { type: String, enum: ['paciente', 'medico', 'colaborador', 'admin', 'sistema'], required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String },
  senderId: { type: String },
  text: { type: String },
  fileUrl: { type: String },
  fileName: { type: String },
  fileType: { type: String, enum: ['image', 'audio', 'text', 'pdf'] },
  timestamp: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  replyTo: {
    id: { type: String },
    senderName: { type: String },
    text: { type: String }
  },
  audioDuration: { type: Number }
}, { _id: false });

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
  status: { type: String, enum: ['Activo', 'Inactivo'], default: 'Activo' },
  messages: [patientChatMessageSchema],
  lastPatientWhatsAppInteractionAt: { type: String }
}, {
  timestamps: true
});

patientSchema.index({ tenantId: 1, dni: 1 });

export const Patient = mongoose.models.Patient || mongoose.model<IPatient>('Patient', patientSchema);

