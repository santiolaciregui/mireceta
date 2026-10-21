/** US-013 / T-002, 2026-10-21. Best-effort authenticated diagnostics, separate from business requests. */
import { getToken } from './api';

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
interface TraceOptions {
  local?: StorageLike;
  session?: StorageLike;
  send?: (body: Record<string, unknown>) => void;
  id?: () => string;
}

export function createOrderFlowTrace(userKey: string, options: TraceOptions = {}) {
  const id = options.id || (() => globalThis.crypto?.randomUUID?.() || `trace-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const formId = id();
  let sessionId = id();
  let local: StorageLike | undefined;
  let persisted = true;
  const key = `mireceta_last_attempt_${userKey}`;
  let previous: Record<string, string> = {};
  const safeId = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value) ? value : undefined;
  try {
    local = options.local || window.localStorage;
    const session = options.session || window.sessionStorage;
    sessionId = safeId(session.getItem('mireceta_flow_session')) || sessionId;
    session.setItem('mireceta_flow_session', sessionId);
    const value = JSON.parse(local.getItem(key) || '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) previous = {
      clientRequestId: safeId(value.clientRequestId), orderId: safeId(value.orderId),
    };
  } catch { persisted = false; }
  let count = 0;
  const failures = new Set<string>();
  let savedDraft = false;
  const send = options.send || ((body: Record<string, unknown>) => {
    const token = getToken();
    if (!token) return;
    void fetch('/api/orders/flow-events', {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).catch(() => undefined);
  });
  const snapshot = (clientRequestId: string, orderId?: string | null) => ({
    sessionId, formId, clientRequestId, orderId: orderId || undefined, persisted,
    previousClientRequestId: previous.clientRequestId,
    previousOrderId: previous.orderId,
    requestIdChanged: !!previous.clientRequestId && previous.clientRequestId !== clientRequestId,
  });
  const event = (event: string, context: Record<string, unknown> = {}) => {
    if (count >= 40) return;
    count += 1;
    try { send({ event, context: { sessionId, formId, ...context, clientAt: new Date().toISOString() } }); } catch { /* Diagnostics must never block checkout. */ }
  };
  return {
    snapshot, event,
    draftLoaded: (draftOutcome: 'restored' | 'missing' | 'expired' | 'invalid' | 'read_failed') => {
      event('draft_loaded', { draftOutcome });
    },
    draftSaved: (saved: boolean) => {
      if (savedDraft || !saved) return;
      savedDraft = true;
      event('draft_saved');
    },
    storageFailure: (storageOperation: 'read' | 'write' | 'remove') => {
      if (failures.has(storageOperation)) return;
      failures.add(storageOperation);
      event('draft_storage_failed', { storageOperation });
    },
    remember: (clientRequestId: string, orderId?: string | null) => {
      try {
        local?.setItem(key, JSON.stringify({ clientRequestId, orderId: orderId || undefined }));
      } catch { persisted = false; }
    },
  };
}
