/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formatea una fecha ISO a string legible en formato es-AR con hora.
 * Ejemplo: "12/08/2026, 15:30 hs"
 */
export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return (
      d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' hs'
    );
  } catch {
    return isoString;
  }
}

/**
 * Formatea una fecha ISO como tiempo relativo en español.
 * Ejemplo: "Hace 5 min", "Hace 2 h", "Ayer", "Hace 3 días"
 */
export function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return formatDate(isoString).split(',')[0];
  } catch {
    return '';
  }
}

/**
 * Formatea una fecha ISO a fecha corta (sin hora). Ejemplo: "12/08/2026"
 */
export function formatDateShort(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}
