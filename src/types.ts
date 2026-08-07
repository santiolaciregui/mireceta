/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OrderStatus = 
  | 'Pendiente' 
  | 'En revisión' 
  | 'Solicita más información' 
  | 'Aprobada' 
  | 'Rechazada' 
  | 'Emitida' 
  | 'Enviada';

export interface MedicationItem {
  nombreComercial: string;
  droga?: string;
  miligramos?: string;
  presentacion?: string;
  unidadesPorCaja?: number;
  cantidadCajas: number;
  diagnostic?: string;
  comments?: string;
  photoUrl?: string;
}

export interface AuditLogEntry {
  action: string;      // e.g., 'Creada', 'Inició revisión', 'Solicitó más información', 'Aprobada', 'Rechazada', 'Emitida', 'Enviada', 'Devolución de pago'
  user: string;        // e.g., 'Operador Juan Perez', 'Dr. Gómez', 'Paciente (Autogestión)'
  timestamp: string;   // ISO String
  notes?: string;
}

export interface NotificationEntry {
  type: 'solicitud_recibida' | 'pago_confirmado' | 'en_revision' | 'mas_info_requerida' | 'emitida' | 'rechazada' | 'devolucion_pago';
  sentTo: string;      // Email and/or WhatsApp
  sentAt: string;      // ISO String
  subject: string;
  content: string;
}

export interface MedicalOrder {
  id: string;
  tenantId?: string;
  patientName: string;
  patientLastName: string;
  patientDni: string;
  patientBirthDate: string; // Birth Date
  patientEmail: string;     // Email
  patientPhone: string;     // WhatsApp
  deliveryMethod: 'email' | 'whatsapp' | 'both'; // Receiver channels

  obraSocial: string;
  obraSocialNumber?: string;
  
  // Medications
  medicationMethod: 'manual' | 'foto';
  medicationText: string;
  medicationItems?: MedicationItem[];
  diagnostic: string;       // Mandatory Diagnostic
  comments?: string;        // Optional Comments
  
  // Base64 or object-urls for mock files
  medicationPhotos?: { url: string; name: string }[];
  medicationPhotoUrl: string | null;
  medicationPhotoName: string | null;
  
  // Payments (Mercado Pago)
  paymentReceiptUrl: string | null;
  paymentReceiptName: string | null;
  paymentAmount: string;
  paymentDate: string;
  paymentId?: string;       // MP Transaction ID
  paymentStatus?: 'approved' | 'pending' | 'rejected' | 'refunded';
  
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;

  // Added by doctor
  recipePdfUrl: string | null;
  recipePdfName: string | null;
  doctorNotes?: string;

  // Chronic renewal questions
  lastConsultationTime?: string; // e.g. "Hace menos de 3 meses" | "Hace entre 3 y 6 meses" | "Hace más de 6 meses"
  lastConsultationDoctor?: string; // Name of the physician
  
  // Operator tracking
  createdByOperatorId?: string;
  createdByOperatorName?: string;

  // Consents accepted
  consentsAccepted?: {
    isOfAge: boolean;
    termsAccepted: boolean;
    informedConsentAccepted: boolean;
    swornStatementAccepted: boolean;
    acceptedAt: string;      // Timestamp of terms acceptance
    termsVersion: string;    // Version string e.g. "v1.2"
  };

  // Audits and Simulated Communications
  auditLog?: AuditLogEntry[];
  notificationsSent?: NotificationEntry[];
  
  // Chat messages
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  sender: 'paciente' | 'medico' | 'colaborador' | 'sistema';
  senderName: string;
  text?: string;
  fileUrl?: string; // for image or audio
  fileName?: string;
  fileType?: 'image' | 'audio' | 'text' | 'pdf';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  replyTo?: {
    id: string;
    senderName: string;
    text?: string;
  };
  audioDuration?: number;
}

export type UserRole = 'paciente' | 'medico' | 'admin' | 'colaborador' | 'operador' | 'superadmin';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
}

export type DeliveryMethod = 'email' | 'whatsapp' | 'both';

export interface DependentPatient {
  id: string;
  name: string;
  lastName: string;
  dni: string;
  birthDate: string;
  relationship: string; // e.g. 'Titular', 'Hijo/a', 'Padre/Madre', 'Cónyuge', 'Otro'
  obraSocial?: string;
  obraSocialNumber?: string;
  email?: string;
  phone?: string;
}

export interface SystemUser {
  id: string;
  tenantId?: string; // Temporarily optional for the DB schema so we can migrate
  name: string;
  lastName: string;
  role: UserRole;
  identifier: string; // DNI for Patient, Matrícula for Doctor/Medic, Username for Admin/Operator
  email: string;
  status: 'Activo' | 'Inactivo';
  password?: string;
  medicoId?: string; // If 'colaborador', which doctor account is this operator linked to
  medicoName?: string; // Friendly name of the doctor
  requirePasswordChange?: boolean;
  phone?: string;
  birthDate?: string;
  obraSocial?: string;
  obraSocialNumber?: string;
  dependents?: DependentPatient[];
}

export interface ObraSocialOption {
  id: string;
  name: string;
  requiresNumber: boolean;
}

export const OBRA_SOCIAL_OPTIONS: ObraSocialOption[] = [
  { id: 'pami', name: 'PAMI (Inssjp)', requiresNumber: true },
  { id: 'ioma', name: 'IOMA', requiresNumber: true },
  { id: 'osde', name: 'OSDE', requiresNumber: true },
  { id: 'osecac', name: 'OSECAC', requiresNumber: true },
  { id: 'swiss', name: 'Swiss Medical', requiresNumber: true },
  { id: 'galeno', name: 'GALENO', requiresNumber: true },
  { id: 'sancor', name: 'Sancor Salud', requiresNumber: true },
  { id: 'medicus', name: 'Medicus', requiresNumber: true },
  { id: 'ospedyc', name: 'OSPEDYC', requiresNumber: true },
  { id: 'osdepym', name: 'OSDEPYM', requiresNumber: true },
  { id: 'camioneros', name: 'Obra Social de Camioneros', requiresNumber: true },
  { id: 'union_personal', name: 'Unión Personal', requiresNumber: true },
  { id: 'osuthgra', name: 'OSUTHGRA (Gastronómicos)', requiresNumber: true },
  { id: 'ospacp', name: 'OSPACP (Personal de Casas Particulares)', requiresNumber: true },
  { id: 'ospg', name: 'OSPG (Petroleros)', requiresNumber: true },
  { id: 'particular', name: 'Particular / Sin Obra Social', requiresNumber: false },
  { id: 'otra', name: 'Otra Obra Social / Prepaga', requiresNumber: true },
];
