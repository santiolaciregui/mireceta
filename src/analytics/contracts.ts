/** US-015 / T-001, 2026-10-29. Only bounded technical data crosses the analytics boundary. */
export const DAY = 86400000;
export const SESSION_IDLE_MS = 30 * 60000;
export const ACTIVE_IDLE_MS = 60000;
export const ANALYTICS_STEPS = [
  "info",
  "identification",
  "medication",
  "payment",
  "confirmation",
] as const;
export const PAGE_CODES = [
  "landing",
  "auth",
  "patient_form",
  "patient_status",
  "staff",
  "other_public",
] as const;
export const FORM_EVENTS = [
  "form_opened",
  "form_started",
  "form_step_viewed",
  "form_validation_failed",
  "clinical_data_completed",
  "payment_step_viewed",
  "submit_attempted",
  "checkout_redirected",
  "form_reset",
] as const;
export type ActorType = "public" | "patient" | "staff";
export interface BrowserEvent {
  eventId: string;
  name: "page_view" | "activity" | (typeof FORM_EVENTS)[number];
  pageViewId: string;
  pageCode?: (typeof PAGE_CODES)[number];
  formAttemptId?: string;
  step?: (typeof ANALYTICS_STEPS)[number];
  validationCategory?: "required" | "format" | "upload" | "other";
  sequence: number;
  activeMs?: number;
}
export interface AnalyticsView {
  kind: "view";
  tenantId: string;
  environment: string;
  visitorId: string;
  sessionId: string;
  pageViewId: string;
  pageCode: string;
  actorType: ActorType;
  identityMode: "persistent" | "ephemeral";
  isTest: boolean;
  firstReceivedAt: Date;
  lastReceivedAt: Date;
  activeMs: number;
  lastSequence: number;
  hasActivitySample: boolean;
}
export interface AnalyticsEvent extends BrowserEvent {
  tenantId: string;
  environment: string;
  visitorId: string;
  sessionId: string;
  receivedAt: Date;
  actorType: ActorType;
  isTest: boolean;
}
export interface AnalyticsFact {
  kind: "order_fact";
  tenantId: string;
  environment: string;
  orderId: string;
  origin: "patient" | "staff" | "unknown";
  formAttemptId?: string;
  visitorId?: string;
  originSessionId?: string;
  createdAt: Date;
  firstApprovedAt?: Date;
  approvalTimeKnown: boolean;
  latestPaymentStatus: string;
  latestPaymentMethod: string;
  orderStatus?: string;
  lastPaymentRecordedAt?: Date;
  approvalSource?: string;
  lastObservedAt: Date;
  attribution: "linked" | "unlinked";
  isTest?: boolean;
}
export interface ReportPeriod {
  from: string;
  to: string;
  label: string;
  start: number;
  end: number;
}
export interface Coverage {
  start: Date | null;
  pauses: { start: Date; end?: Date }[];
  lastReconciledAt?: Date;
  reconciliationError?: boolean;
}
export interface Metric {
  value: number | null;
  numerator?: number;
  denominator?: number;
  reason?: string;
}
export interface PeriodReport {
  label: string;
  from: string;
  to: string;
  coverage: "unavailable" | "partial" | "complete";
  inObservation: boolean;
  metrics: Record<string, Metric>;
  lastSteps: Record<string, number>;
}
export const METRIC_LABELS: Record<string, string> = {
  startedAttempts: "Formularios con interacción observada",
  validationFailures: "Errores de validación observados",
  step_info: "Intentos que vieron Información",
  step_identification: "Intentos que vieron Identificación",
  step_medication: "Intentos que vieron Medicación",
  step_payment: "Intentos que vieron Pago",
  step_confirmation: "Intentos que vieron Confirmación",
  stopped_info: "Sin envío observado: Información (estimado)",
  stopped_identification: "Sin envío observado: Identificación (estimado)",
  stopped_medication: "Sin envío observado: Medicación (estimado)",
  stopped_payment: "Sin envío observado: Pago (estimado)",
  stopped_confirmation: "Sin envío observado: Confirmación (estimado)",
  unpaidPending: "Solicitudes atribuidas con pago pendiente",
  unpaidRejected: "Solicitudes atribuidas con pago rechazado",
  unpaidCancelled: "Solicitudes atribuidas canceladas sin pago",
  unpaidTransfer: "Transferencias atribuidas sin pago confirmado",
  botRequests: "Requests de bots reconocidos excluidos",
  visitors: "Visitantes estimados",
  sessions: "Sesiones",
  views: "Vistas",
  activeSeconds: "Tiempo activo medio (segundos)",
  missingSamples: "Sesiones sin muestras de actividad",
  ephemeralVisitors: "Visitantes con identidad efímera",
  under10: "Sesiones con menos de 10 s activos",
  from10: "Sesiones con 10 a 59 s activos",
  from60: "Sesiones con 60 a 179 s activos",
  over180: "Sesiones con 180 s activos o más",
  openedSessions: "Sesiones con apertura de formulario",
  attempts: "Intentos de formulario abiertos",
  savedSessions: "Sesiones con solicitud guardada",
  savedAttempts: "Intentos con solicitud guardada",
  attributedOrders: "Solicitudes atribuidas",
  paidSessions: "Sesiones con pago confirmado en ventana",
  paidOrders: "Solicitudes con pago confirmado en ventana",
  exempt: "Solicitudes atribuidas exentas",
  chargeable: "Solicitudes atribuidas con cobro",
  unknownApproval: "Aprobaciones de fecha desconocida",
  latePayments: "Pagos posteriores a la ventana",
  unsubmitted: "Intentos sin envío observado (estimado)",
  visitToForm: "Conversión sesión a formulario",
  visitToOrder: "Conversión sesión a solicitud",
  formToOrder: "Conversión formulario a solicitud",
  visitToPayment: "Conversión sesión a pago",
  orderToPayment: "Conversión solicitud con cobro a pago",
  businessPatient: "Solicitudes creadas por pacientes (estado al corte)",
  businessStaff: "Solicitudes creadas por personal (estado al corte)",
  businessUnknownOrigin: "Solicitudes de origen desconocido",
  businessApproved: "Solicitudes con pago aprobado actualmente",
  businessExempt: "Solicitudes exentas actualmente",
  businessPending: "Solicitudes con pago pendiente",
  businessRejected: "Solicitudes con pago rechazado",
  businessRefunded: "Solicitudes reintegradas actualmente",
  unlinked: "Solicitudes sin atribución",
  staffSessions: "Sesiones de personal excluidas",
  testSessions: "Sesiones de prueba excluidas",
};
