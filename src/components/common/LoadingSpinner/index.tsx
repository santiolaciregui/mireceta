/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity } from 'lucide-react';

interface LoadingSpinnerProps {
  /** Texto a mostrar debajo del spinner */
  message?: string;
  /** Texto secundario más pequeño */
  subMessage?: string;
}

/**
 * Spinner de carga animado con icono central.
 * Extrae el spinner duplicado que existía en 2 condiciones de App.tsx.
 */
export default function LoadingSpinner({ message, subMessage }: LoadingSpinnerProps) {
  return (
    <div className="min-h-screen bg-mesh flex flex-col font-sans items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="h-14 w-14 border-4 border-[#1661E1]/20 border-t-[#1661E1] rounded-full animate-spin" />
          <Activity className="absolute inset-0 m-auto h-6 w-6 text-[#1661E1] animate-pulse" />
        </div>
        {message && (
          <div>
            <p className="text-xs sm:text-sm font-bold text-[#0141BC]">{message}</p>
            {subMessage && (
              <p className="text-[10px] text-slate-400 mt-1">{subMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
