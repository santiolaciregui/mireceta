/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles } from 'lucide-react';

interface ToastProps {
  /** Mensaje a mostrar. Si es null, el toast no se renderiza. */
  message: string | null;
  /** Posición del toast. Default: 'bottom-right' */
  position?: 'bottom-right' | 'bottom-center' | 'top-center';
}

/**
 * Componente de feedback temporal (toast).
 * Se usa junto con el hook useToast.
 *
 * @example
 * const { toast, showToast } = useToast();
 * // ...
 * <Toast message={toast} />
 */
export default function Toast({ message, position = 'bottom-right' }: ToastProps) {
  if (!message) return null;

  const positionClass = {
    'bottom-right': 'bottom-5 right-5',
    'bottom-center': 'bottom-5 left-1/2 -translate-x-1/2',
    'top-center': 'top-5 left-1/2 -translate-x-1/2',
  }[position];

  return (
    <div
      className={`fixed ${positionClass} z-50 bg-[var(--ink)] text-white py-3 px-6 rounded-lg shadow-xl text-[0.85rem] font-[500] animate-fadeIn flex items-center gap-2`}
      role="alert"
      aria-live="polite"
    >
      <Sparkles className="h-4 w-4 text-[var(--accent)] shrink-0" />
      <span>{message}</span>
    </div>
  );
}
