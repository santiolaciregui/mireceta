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
 * Ensures correct country code and strips local prefixes like 0 and 15 without altering national digits.
 */
export function formatWhatsAppPhone(phone: string | null | undefined, defaultCountryCode: string = '54'): string {
  if (!phone) return '';
  const raw = String(phone).trim();
  const hasPlus = raw.startsWith('+');
  let cleaned = cleanPhone(raw);
  if (!cleaned) return '';

  // Strip international dialing prefix '00'
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // If number originally had a '+' and is not Argentine
  if (hasPlus && !cleaned.startsWith('54')) {
    return cleaned;
  }

  // Argentina formatting rules (+54)
  if (cleaned.startsWith('54')) {
    let national = cleaned.substring(2);
    if (national.startsWith('0')) national = national.substring(1);

    // Strip 15 in mobile numbers if present
    if (national.startsWith('9')) {
      let after9 = national.substring(1);
      if (after9.startsWith('0')) after9 = after9.substring(1);
      if (after9.startsWith('1115')) {
        after9 = `11${after9.substring(4)}`;
      } else if (after9.length >= 8 && after9.includes('15')) {
        after9 = after9.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');
      }
      national = after9;
    } else {
      if (national.startsWith('1115')) {
        national = `11${national.substring(4)}`;
      } else if (national.length >= 8 && national.includes('15')) {
        national = national.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');
      }
    }
    return `54${national}`;
  }

  // If local starts with 0 (e.g. 02926 414331 -> 2926 414331)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Remove local 15 prefix
  if (cleaned.startsWith('15')) {
    cleaned = cleaned.substring(2);
    if (cleaned.length === 8) {
      cleaned = `11${cleaned}`;
    }
  } else if (cleaned.startsWith('1115')) {
    cleaned = `11${cleaned.substring(4)}`;
  } else if (cleaned.length >= 8 && cleaned.includes('15')) {
    cleaned = cleaned.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');
  }

  if (defaultCountryCode === '54') {
    return `54${cleaned}`;
  }

  if (!cleaned.startsWith(defaultCountryCode)) {
    return `${defaultCountryCode}${cleaned}`;
  }

  return cleaned;
}
