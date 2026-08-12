/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';

interface UseToastReturn {
  toast: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

/**
 * Hook reutilizable para mostrar mensajes de feedback temporal (toast).
 * Elimina la duplicación del patrón [toast, setToast] + showToast
 * que existía en DoctorDashboard y PatientStatus.
 *
 * @param durationMs - Duración en milisegundos antes de ocultar el toast (default: 4500)
 */
export function useToast(durationMs = 4500): UseToastReturn {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string): void => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, durationMs);
  };

  const clearToast = (): void => {
    setToast(null);
  };

  return { toast, showToast, clearToast };
}
