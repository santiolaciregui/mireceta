/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseToastReturn {
  toast: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

/**
 * Hook reutilizable para mostrar mensajes de feedback temporal (toast).
 * Elimina la duplicación del patrón [toast, setToast] + showToast
 * y maneja adecuadamente la cancelación y reinicio de temporizadores.
 *
 * @param durationMs - Duración en milisegundos antes de ocultar el toast (default: 4500)
 */
export function useToast(durationMs = 4500): UseToastReturn {
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearToast = useCallback((): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((message: string): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast(message);
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, durationMs);
  }, [durationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { toast, showToast, clearToast };
}
