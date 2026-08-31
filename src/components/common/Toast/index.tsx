/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface ToastProps {
  /** Mensaje a mostrar. Si es null, el toast no se renderiza. */
  message: string | null;
  /** Posición del toast. Default: 'bottom-right' */
  position?: 'bottom-right' | 'bottom-center' | 'top-center' | 'top-right';
  /** Tipo visual del toast. Default: 'success' */
  type?: 'success' | 'info' | 'warning' | 'error';
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
export default function Toast({ 
  message, 
  position = 'bottom-right',
  type = 'success'
}: ToastProps) {
  if (!message) return null;

  const positionClass = {
    'bottom-right': 'bottom-5 right-5',
    'bottom-center': 'bottom-5 left-1/2 -translate-x-1/2',
    'top-center': 'top-5 left-1/2 -translate-x-1/2',
    'top-right': 'top-5 right-5',
  }[position];

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4.5 w-4.5 text-[#14BE99] shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-4.5 w-4.5 text-amber-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="h-4.5 w-4.5 text-rose-400 shrink-0" />;
      case 'info':
      default:
        return <Sparkles className="h-4.5 w-4.5 text-[var(--accent)] shrink-0" />;
    }
  };

  return (
    <div
      className={`fixed ${positionClass} z-50 bg-[#0F172A] text-white py-3 px-5 rounded-2xl shadow-2xl text-xs sm:text-[0.85rem] font-semibold animate-fadeIn flex items-center gap-2.5 border border-slate-700/60 backdrop-blur-md max-w-[90vw] sm:max-w-md`}
      role="alert"
      aria-live="polite"
    >
      {renderIcon()}
      <span className="leading-snug">{message}</span>
    </div>
  );
}
