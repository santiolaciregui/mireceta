/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Valida formato de email.
 * Usado en NotificationConfigPanel y UserManagement.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Valida que un campo requerido no esté vacío.
 */
export function isRequiredFilled(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Valida que un DNI argentino sea numérico y tenga entre 7 y 8 dígitos.
 */
export function isValidDni(dni: string): boolean {
  return /^\d{7,8}$/.test(dni.trim());
}

/**
 * Valida número de teléfono argentino simple (solo dígitos, entre 8 y 15 chars).
 */
export function isValidPhone(phone: string): boolean {
  return /^[\d+\-\s]{8,15}$/.test(phone.trim());
}
