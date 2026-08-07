/**
 * Utility functions for string formatting and cleaning across the application.
 */

/**
 * Normalizes a DNI/Identification number by removing any non-digit characters.
 */
export function cleanDni(dni: string | null | undefined): string {
  if (!dni) return '';
  return dni.replace(/\D/g, '').trim();
}

/**
 * Strips all non-digit characters from a phone number.
 */
export function cleanPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '').trim();
}

/**
 * Formats a phone number for international WhatsApp messaging (Meta Cloud API).
 * Handles Argentine prefix rules (+54 9, removes 0/00/etc.).
 */
export function formatWhatsAppPhone(phone: string, defaultCountryCode: string = '54'): string {
  let cleaned = cleanPhone(phone);
  if (!cleaned) return '';

  // Strip international dialing prefix '00'
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Argentina formatting rules
  if (cleaned.startsWith('54')) {
    let national = cleaned.substring(2);
    if (national.startsWith('0')) national = national.substring(1);
    // Meta WhatsApp Cloud API strictly requires mobile numbers in Argentina to have '9' before the area code
    if (!national.startsWith('9')) {
      national = `9${national}`;
    }
    return `54${national}`;
  }

  // If local starts with 0
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  if (defaultCountryCode === '54') {
    if (cleaned.startsWith('9')) {
      return `54${cleaned}`;
    }
    return `549${cleaned}`;
  }

  if (!cleaned.startsWith(defaultCountryCode)) {
    return `${defaultCountryCode}${cleaned}`;
  }

  return cleaned;
}
