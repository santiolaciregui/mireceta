/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  itemSummary?: {
    id?: string;
    title?: string;
    subtitle?: string;
    tag?: string;
    extra?: string;
  };
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Eliminar Solicitud?',
  description = 'Esta acción eliminará de forma permanente la solicitud y todos los datos asociados. No se puede deshacer.',
  itemSummary,
  confirmLabel = 'Sí, eliminar',
  cancelLabel = 'Cancelar',
  isLoading = false,
}: ConfirmDeleteModalProps) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp max-h-[calc(100dvh-2rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        {/* Modal Header */}
        <div className="bg-rose-50 border-b border-rose-100 px-5 py-4 sm:py-5 flex items-center gap-3.5 shrink-0">
          <div className="h-10 w-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h3 id="confirm-delete-title" className="text-base font-extrabold text-slate-900 leading-tight">
              {title}
            </h3>
            <p className="text-[11px] text-rose-700 font-semibold flex items-center gap-1 mt-0.5">
              <AlertTriangle className="h-3 w-3 inline shrink-0" />
              Acción irreversible
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            {description}
          </p>

          {itemSummary && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 text-sm truncate">
                  {itemSummary.title || 'Solicitud'}
                </span>
                {itemSummary.tag && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 shrink-0">
                    {itemSummary.tag}
                  </span>
                )}
              </div>

              {itemSummary.subtitle && (
                <p className="text-slate-600 text-xs">
                  {itemSummary.subtitle}
                </p>
              )}

              <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono border-t border-slate-200/80 mt-2">
                {itemSummary.id && <span>ID: {itemSummary.id}</span>}
                {itemSummary.extra && <span>{itemSummary.extra}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-xs font-bold text-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
