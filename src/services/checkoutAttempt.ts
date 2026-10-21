// US-014, 2026-10-21: durable checkout identity, independent of photo drafts.
import { apiFetchJson } from './api';

export interface CheckoutAttempt {
  clientRequestId: string;
  orderId?: string;
  fingerprint: string;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type CheckoutLock = <T>(name: string, work: () => Promise<T>) => Promise<T>;
const key = (scope: string) => `mireceta_checkout_v1_${encodeURIComponent(scope)}`;
const storageError = () => new Error('No se pudo guardar el intento de pago. Habilitá el almacenamiento del navegador antes de continuar.');

export function readCheckoutAttempt(scope: string, storage: Store = localStorage): CheckoutAttempt | null {
  try {
    const raw = storage.getItem(key(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(parsed.clientRequestId)
      || typeof parsed.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(parsed.fingerprint)
      || (parsed.orderId !== undefined && !/^[a-zA-Z0-9_-]{1,120}$/.test(parsed.orderId))) throw storageError();
    return { clientRequestId: parsed.clientRequestId, orderId: parsed.orderId, fingerprint: parsed.fingerprint };
  } catch { throw storageError(); }
}

export function saveCheckoutAttempt(scope: string, attempt: CheckoutAttempt, storage: Store = localStorage) {
  try {
    // No form values, attachments or credentials in this small journal.
    storage.setItem(key(scope), JSON.stringify(attempt));
    if (storage.getItem(key(scope)) !== JSON.stringify(attempt)) throw storageError();
  } catch { throw storageError(); }
}

export const withCheckoutLock: CheckoutLock = async (scope, work) => {
  if (!globalThis.navigator?.locks) throw new Error('Actualizá tu navegador para continuar el pago de forma segura.');
  return navigator.locks.request(key(scope), work);
};

export async function clearCheckoutAttempt(scope: string, storage: Store = localStorage, lock = withCheckoutLock) {
  await lock(scope, async () => {
    try { storage.removeItem(key(scope)); } catch { throw storageError(); }
  });
}

export async function checkoutFingerprint(payload: Record<string, unknown>): Promise<string> {
  const fields = ['patientDni', 'patientName', 'patientLastName', 'patientBirthDate', 'patientEmail',
    'patientPhone', 'patientCity', 'patientProvince', 'deliveryMethod', 'lastConsultationTime',
    'lastConsultationDoctor', 'dependentRelationship', 'obraSocial', 'obraSocialNumber', 'medicationMethod', 'medicationText',
    'medicationItems', 'medicationPhotos', 'diagnostic', 'comments', 'paymentAmount', 'isForDependent', 'requestedByTitularDni'];
  const bytes = new TextEncoder().encode(JSON.stringify(fields.map(field => payload[field] ?? null)));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

export async function findCheckoutOrder(clientRequestId: string): Promise<string | null> {
  const data = await apiFetchJson<{ orderId: string | null }>(`/api/orders/checkout-attempt/${encodeURIComponent(clientRequestId)}`,
    { cache: 'no-store' });
  return data.orderId;
}

export async function createOrResumeCheckout(options: {
  scope: string;
  clientRequestId: string;
  payload: Record<string, unknown>;
  create: (payload: any) => Promise<string>;
  lookup?: typeof findCheckoutOrder;
  storage?: Store;
  lock?: CheckoutLock;
}): Promise<CheckoutAttempt & { orderId: string; reused: boolean }> {
  const { scope, payload, create, clientRequestId, lookup = findCheckoutOrder,
    storage = localStorage, lock = withCheckoutLock } = options;
  const fingerprint = await checkoutFingerprint(payload);
  return lock(scope, async () => {
    let attempt = readCheckoutAttempt(scope, storage);
    if (attempt && attempt.fingerprint !== fingerprint) {
      throw new Error('Hay un intento de pago con otros datos. Continuá la solicitud vinculada o elegí crear una nueva.');
    }
    attempt ||= { clientRequestId, fingerprint };
    saveCheckoutAttempt(scope, attempt, storage);
    // Recover a committed create whose response was lost; never infer identity from content.
    const existingOrderId = attempt.orderId || await lookup(attempt.clientRequestId);
    const orderId = existingOrderId || await create({ ...payload, clientRequestId: attempt.clientRequestId });
    const completed = { ...attempt, orderId };
    saveCheckoutAttempt(scope, completed, storage);
    return { ...completed, reused: !!existingOrderId };
  });
}
