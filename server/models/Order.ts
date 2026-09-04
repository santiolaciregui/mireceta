import mongoose, { Schema, Document, Model } from 'mongoose';

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
  timestamp: string;
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
  id: string;
  tenantId?: string;
  patientName: string;
  patientLastName: string;
  patientDni: string;
  patientBirthDate: string;
  patientEmail: string;
  patientPhone: string;
  patientCity?: string;
  patientProvince?: string;
  deliveryMethod: 'email' | 'whatsapp' | 'both';

  obraSocial: string;
  obraSocialNumber?: string;
  
  medicationMethod: 'manual' | 'foto';
  medicationText: string;
  medicationItems?: IMedicationItem[];
  diagnostic: string;
  comments?: string;
  
  medicationPhotos?: {
    url: string;
    name: string;
    cantidadCajas?: number;
    unidadesPorCaja?: number;
    diagnostic?: string;
    comments?: string;
  }[];
  medicationPhotoUrl: string | null;
  medicationPhotoName: string | null;
  
  paymentMethod?: 'mp' | 'transfer' | 'cash_desk' | 'bonificado';
  paymentReceiptUrl: string | null;
  paymentReceiptName: string | null;
  paymentAmount: string;
  paymentDate: string;
  paymentId?: string;
  paymentStatus: 'approved' | 'pending' | 'rejected' | 'refunded' | 'exempt';
  
  status: 'Pendiente' | 'En revisión' | 'Solicita más información' | 'Aprobada' | 'Rechazada' | 'Emitida' | 'Enviada' | 'Cancelada';
  createdAt: string;
  updatedAt?: string;
  
  recipePdfUrl: string | null;
  recipePdfName: string | null;
  doctorNotes?: string;
  issuedByDoctorId?: string;
  issuedByDoctorName?: string;

  lastConsultationTime?: string;
  lastConsultationDoctor?: string;
  
  createdByOperatorId?: string;
  createdByOperatorName?: string;

  isForDependent?: boolean;
  dependentRelationship?: string;
  requestedByTitularName?: string;
  requestedByTitularDni?: string;
  requestedByTitularEmail?: string;
  requestedByTitularPhone?: string;

  consentsAccepted?: {
    isOfAge: boolean;
    termsAccepted: boolean;
    informedConsentAccepted: boolean;
    swornStatementAccepted: boolean;
    acceptedAt: string;
    termsVersion: string;
  };

  auditLog: IAuditLogEntry[];
  notificationsSent?: INotificationEntry[];
  messages?: any[];
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
  type: { type: String, required: true },
  sentTo: { type: String, required: false, default: '' },
  sentAt: { type: String, required: true },
  subject: { type: String, required: false, default: '' },
  content: { type: String, required: false, default: '' }
}, { _id: false });

const chatMessageSchema = new Schema({
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

const medicalOrderSchema = new Schema<IMedicalOrder>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String },
  patientName: { type: String, required: true },
  patientLastName: { type: String, required: true },
  patientDni: { type: String, required: true, index: true },
  patientBirthDate: { type: String, required: false, default: '' },
  patientEmail: { type: String, required: false, default: '' },
  patientPhone: { type: String, required: false, default: '' },
  patientCity: { type: String, required: false, default: '' },
  patientProvince: { type: String, required: false, default: '' },
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
    name: { type: String },
    cantidadCajas: { type: Number, default: 1 },
    unidadesPorCaja: { type: Number },
    diagnostic: { type: String },
    comments: { type: String }
  }],
  medicationPhotoUrl: { type: String },
  medicationPhotoName: { type: String },
  
  paymentMethod: { type: String },
  paymentReceiptUrl: { type: String },
  paymentReceiptName: { type: String },
  paymentAmount: { type: String, required: false, default: '10000' },
  paymentDate: { type: String, required: false, default: () => new Date().toISOString() },
  paymentId: { type: String },
  paymentStatus: { type: String, enum: ['approved', 'pending', 'rejected', 'refunded', 'exempt'], required: false, default: 'pending' },
  
  status: { 
    type: String, 
    enum: ['Pendiente', 'En revisión', 'Solicita más información', 'Aprobada', 'Rechazada', 'Emitida', 'Enviada', 'Cancelada'],
    default: 'Pendiente',
    index: true 
  },
  
  createdAt: { type: String, required: true },
  updatedAt: { type: String },
  
  recipePdfUrl: { type: String },
  recipePdfName: { type: String },
  doctorNotes: { type: String },
  issuedByDoctorId: { type: String },
  issuedByDoctorName: { type: String },
  
  lastConsultationTime: { type: String },
  lastConsultationDoctor: { type: String },
  
  createdByOperatorId: { type: String },
  createdByOperatorName: { type: String },
  
  isForDependent: { type: Boolean, default: false },
  dependentRelationship: { type: String },
  requestedByTitularName: { type: String },
  requestedByTitularDni: { type: String, index: true },
  requestedByTitularEmail: { type: String },
  requestedByTitularPhone: { type: String },

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
  messages: [chatMessageSchema],
  lastPatientWhatsAppInteractionAt: { type: String }
});

export const Order: Model<IMedicalOrder> = (mongoose.models.Order as any) || mongoose.model<IMedicalOrder>('Order', medicalOrderSchema);
