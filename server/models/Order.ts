import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicationItem {
  nombreComercial: string;
  droga: string;
  miligramos: string;
  presentacion: string;
  unidadesPorCaja: number;
  cantidadCajas: number;
  diagnostic?: string;
  comments?: string;
}

export interface IAuditLogEntry {
  action: string;
  user: string;
  timestamp: string; // Keep as string for compatibility with frontend/original API
  notes?: string;
}

export interface INotificationEntry {
  type: 'solicitud_recibida' | 'pago_confirmado' | 'en_revision' | 'mas_info_requerida' | 'emitida' | 'rechazada' | 'devolucion_pago';
  sentTo: string;
  sentAt: string;
  subject: string;
  content: string;
}

export interface IMedicalOrder extends Document {
  id: string; // Mongoose will add _id, but we keep the custom REC-XXXX id format as string
  tenantId?: string; // Temporarily optional for the DB schema so we can migrate
  patientName: string;
  patientLastName: string;
  patientDni: string;
  patientBirthDate: string;
  patientEmail: string;
  patientPhone: string;
  deliveryMethod: 'email' | 'whatsapp' | 'both';

  obraSocial: string;
  obraSocialNumber?: string;
  
  medicationMethod: 'manual' | 'foto';
  medicationText: string;
  medicationItems?: IMedicationItem[];
  diagnostic: string;
  comments?: string;
  
  medicationPhotos?: { url: string; name: string }[];
  medicationPhotoUrl: string | null;
  medicationPhotoName: string | null;
  
  paymentReceiptUrl: string | null;
  paymentReceiptName: string | null;
  paymentAmount: string;
  paymentDate: string;
  paymentId?: string;
  paymentStatus: 'approved' | 'pending' | 'rejected' | 'refunded';
  
  status: 'Pendiente' | 'En revisión' | 'Solicita más información' | 'Aprobada' | 'Rechazada' | 'Emitida' | 'Enviada';
  createdAt: string; // Re-mapping the string createdAt to avoid issues
  updatedAt?: string;
  
  recipePdfUrl: string | null;
  recipePdfName: string | null;
  doctorNotes?: string;

  // Chronic renewal questions
  lastConsultationTime?: string;
  lastConsultationDoctor?: string;
  
  // Operator tracking
  createdByOperatorId?: string;
  createdByOperatorName?: string;

  consentsAccepted?: {
    isOfAge: boolean;
    termsAccepted: boolean;
    informedConsentAccepted: boolean;
    swornStatementAccepted: boolean;
    acceptedAt: string;
    termsVersion: string;
  };

  auditLog: IAuditLogEntry[];
  notificationsSent: INotificationEntry[];
  chatMessages?: any[];
  lastPatientWhatsAppInteractionAt?: string;
}

const medicationItemSchema = new Schema<IMedicationItem>({
  nombreComercial: { type: String, required: true },
  droga: { type: String, required: false, default: '' },
  miligramos: { type: String, required: false, default: '' },
  presentacion: { type: String, required: false, default: '' },
  unidadesPorCaja: { type: Number, required: false, default: 0 },
  cantidadCajas: { type: Number, required: false, default: 1 },
  diagnostic: { type: String, required: false, default: '' },
  comments: { type: String, required: false, default: '' }
}, { _id: false });

const auditLogEntrySchema = new Schema<IAuditLogEntry>({
  action: { type: String, required: true },
  user: { type: String, required: true },
  timestamp: { type: String, required: true },
  notes: { type: String }
}, { _id: false });

const notificationEntrySchema = new Schema<INotificationEntry>({
  type: { 
    type: String, 
    required: true
  },
  sentTo: { type: String, required: false, default: '' },
  sentAt: { type: String, required: true },
  subject: { type: String, required: false, default: '' },
  content: { type: String, required: false, default: '' }
}, { _id: false });

const medicalOrderSchema = new Schema<IMedicalOrder>({
  id: { type: String, required: true, unique: true }, // The custom 'REC-XXXX' id
  tenantId: { type: String }, // Populated during migration
  patientName: { type: String, required: true },
  patientLastName: { type: String, required: true },
  patientDni: { type: String, required: true, index: true },
  patientBirthDate: { type: String, required: false, default: '' },
  patientEmail: { type: String, required: false, default: '' },
  patientPhone: { type: String, required: false, default: '' },
  deliveryMethod: { type: String, enum: ['email', 'whatsapp', 'both'], required: false, default: 'email' },
  
  obraSocial: { type: String, required: true },
  obraSocialNumber: { type: String },
  
  medicationMethod: { type: String, enum: ['manual', 'foto'], required: true },
  medicationText: { type: String, required: false, default: '' },
  medicationItems: [medicationItemSchema],
  diagnostic: { type: String, required: false, default: 'Sin especificar' },
  comments: { type: String },
  
  medicationPhotos: [{
    url: { type: String },
    name: { type: String }
  }],
  medicationPhotoUrl: { type: String },
  medicationPhotoName: { type: String },
  
  paymentReceiptUrl: { type: String },
  paymentReceiptName: { type: String },
  paymentAmount: { type: String, required: false, default: '10000' },
  paymentDate: { type: String, required: false, default: () => new Date().toISOString() },
  paymentId: { type: String },
  paymentStatus: { type: String, enum: ['approved', 'pending', 'rejected', 'refunded'], required: false, default: 'pending' },
  
  status: { 
    type: String, 
    enum: ['Pendiente', 'En revisión', 'Solicita más información', 'Aprobada', 'Rechazada', 'Emitida', 'Enviada'],
    default: 'Pendiente',
    index: true 
  },
  
  createdAt: { type: String, required: true },
  updatedAt: { type: String },
  
  recipePdfUrl: { type: String },
  recipePdfName: { type: String },
  doctorNotes: { type: String },
  
  // Renovación crónica
  lastConsultationTime: { type: String },
  lastConsultationDoctor: { type: String },
  
  // Tracking de operadores
  createdByOperatorId: { type: String },
  createdByOperatorName: { type: String },
  
  consentsAccepted: {
    isOfAge: { type: Boolean },
    termsAccepted: { type: Boolean },
    informedConsentAccepted: { type: Boolean },
    swornStatementAccepted: { type: Boolean },
    acceptedAt: { type: String },
    termsVersion: { type: String }
  },
  
  auditLog: [auditLogEntrySchema],
  notificationsSent: [notificationEntrySchema],
  lastPatientWhatsAppInteractionAt: { type: String }
}); // we manage timestamps manually as strings to preserve previous app logic

export const Order = mongoose.models.Order || mongoose.model<IMedicalOrder>('Order', medicalOrderSchema);
