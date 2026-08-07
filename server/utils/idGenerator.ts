/**
 * Centralized ID generator for domain entities to ensure uniform, predictable identifier formats.
 */

export function generateUserId(count: number): string {
  const sequence = String(count + 1).padStart(4, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `USR-${sequence}-${randomSuffix}`;
}

export function generatePatientId(count: number): string {
  const sequence = String(count + 1).padStart(4, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `PAT-${sequence}-${randomSuffix}`;
}

export function generateOrderId(): string {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `REC-${random}`;
}

export function generateTenantId(count: number): string {
  return `TEN-${String(count + 1).padStart(4, '0')}`;
}

export function generateMessageId(): string {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `msg-${timestamp}-${random}`;
}

export function generateLogId(): string {
  const timestamp = Date.now();
  const random = Math.floor(100 + Math.random() * 900);
  return `LOG-${timestamp}-${random}`;
}
