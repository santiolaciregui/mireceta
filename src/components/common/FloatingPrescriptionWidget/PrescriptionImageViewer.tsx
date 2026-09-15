import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface PrescriptionImageViewerProps {
  image: { url: string; name: string };
  onClose: () => void;
}

export default function PrescriptionImageViewer({ image, onClose }: PrescriptionImageViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    // The dialog belongs to the popup/PiP document, just like the widget portal.
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={event => {
        // Ignore a queued close event if Strict Mode has already reopened the dialog.
        if (!event.currentTarget.open) onClose();
      }}
      aria-label={`Imagen de la solicitud: ${image.name}`}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-slate-950 p-0 text-white backdrop:bg-slate-950/80"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700 p-3">
          <span className="min-w-0 truncate text-xs font-bold">{image.name}</span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setIsZoomed(value => !value)}
              aria-pressed={isZoomed}
              className="flex cursor-pointer items-center gap-1 rounded-lg bg-slate-800 p-2 text-xs hover:bg-slate-700"
            >
              {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
              {isZoomed ? 'Ajustar' : 'Ampliar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar imagen"
              className="cursor-pointer rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          <img
            src={image.url}
            alt={image.name}
            className={isZoomed ? 'block h-auto min-w-full max-w-none' : 'block h-full w-full object-contain'}
          />
        </div>
      </div>
    </dialog>
  );
}
