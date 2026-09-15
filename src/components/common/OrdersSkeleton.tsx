import React from 'react';

/**
 * Skeleton placeholder for patient order cards in PatientStatus view.
 * Matches exact dimensions, badges, and layout of real order cards.
 */
export function PatientOrdersSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando solicitudes...">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs animate-pulse"
        >
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white">
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              {/* Status Icon Box Skeleton */}
              <div className="h-10 w-10 rounded-xl bg-slate-200/70 shrink-0" />

              {/* Order Meta & Badges Skeleton */}
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Order ID badge */}
                  <div className="h-5 w-24 bg-slate-200/80 rounded-md" />
                  {/* Patient Name badge */}
                  <div className="h-5 w-36 bg-slate-200/60 rounded-full" />
                  {/* Status pill */}
                  <div className="h-5 w-20 bg-slate-200/80 rounded-full" />
                  {/* Date */}
                  <div className="h-4 w-16 bg-slate-200/50 rounded ml-auto sm:ml-0" />
                </div>

                {/* Medication Chips Skeleton */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <div className="h-3.5 w-3.5 rounded-full bg-slate-200/60" />
                  <div className="h-5 w-32 bg-slate-200/70 rounded-md" />
                  <div className="h-5 w-44 bg-slate-200/50 rounded-md" />
                </div>
              </div>
            </div>

            {/* Right Action buttons Skeleton */}
            <div className="flex items-center gap-2 pt-2 sm:pt-0 self-end sm:self-center">
              <div className="h-8 w-24 bg-slate-200/60 rounded-xl" />
              <div className="h-8 w-8 bg-slate-200/60 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Cargando solicitudes de recetas médicas...</span>
    </div>
  );
}

/**
 * Skeleton placeholder for doctor sidebar order items in DoctorDashboard.
 * Matches exact structure and dimensions of order-card.
 */
export function DoctorOrdersSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-slate-100" role="status" aria-label="Cargando listado de órdenes...">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-3 sm:p-4 space-y-2 animate-pulse bg-white">
          <div className="flex items-center justify-between gap-2">
            {/* ID */}
            <div className="h-3.5 w-20 bg-slate-200/80 rounded" />
            {/* Date */}
            <div className="h-3 w-16 bg-slate-200/50 rounded" />
          </div>

          {/* Patient full name */}
          <div className="h-4 w-44 bg-slate-200/90 rounded" />

          {/* Obra Social & DNI row */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="h-3 w-32 bg-slate-200/60 rounded" />
            <div className="h-4 w-14 bg-slate-200/70 rounded-full" />
          </div>

          {/* Status dot */}
          <div className="h-2 w-2 rounded-full bg-slate-200/70 mt-1" />
        </div>
      ))}
      <span className="sr-only">Cargando órdenes del profesional...</span>
    </div>
  );
}

/**
 * Skeleton placeholder for the main detail pane in DoctorDashboard.
 * Replicates the clinical detail pane structure: badges, patient name,
 * info cards, medication summary, and action panel.
 */
export function DoctorDetailSkeleton() {
  return (
    <div
      className="space-y-6 pb-12 w-full max-w-5xl mx-auto p-4 sm:p-6 animate-pulse"
      role="status"
      aria-label="Cargando detalles de la solicitud..."
    >
      {/* Header Skeleton */}
      <div className="border-b border-slate-200/80 pb-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-24 rounded-full bg-slate-200/80" />
            <div className="h-6 w-32 rounded-full bg-slate-200/60" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-32 rounded-xl bg-slate-200/60" />
            <div className="h-8 w-36 rounded-xl bg-slate-200/60" />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="h-8 w-72 bg-slate-200/90 rounded-lg" />
          <div className="h-4 w-48 bg-slate-200/50 rounded" />
        </div>

        {/* Floating banner placeholder */}
        <div className="h-20 w-full rounded-2xl bg-slate-100 border border-slate-200/60" />
      </div>

      {/* Grid of clinical cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="h-24 rounded-2xl bg-slate-50 border border-slate-200/60 p-4 space-y-2">
          <div className="h-3.5 w-24 bg-slate-200/60 rounded" />
          <div className="h-5 w-36 bg-slate-200/80 rounded" />
        </div>
        <div className="h-24 rounded-2xl bg-slate-50 border border-slate-200/60 p-4 space-y-2">
          <div className="h-3.5 w-24 bg-slate-200/60 rounded" />
          <div className="h-5 w-40 bg-slate-200/80 rounded" />
        </div>
        <div className="h-24 rounded-2xl bg-slate-50 border border-slate-200/60 p-4 space-y-2">
          <div className="h-3.5 w-20 bg-slate-200/60 rounded" />
          <div className="h-5 w-28 bg-slate-200/80 rounded" />
        </div>
      </div>

      {/* Medication card skeleton */}
      <div className="rounded-2xl border border-slate-200/70 p-5 bg-white space-y-3 shadow-xs">
        <div className="h-5 w-48 bg-slate-200/80 rounded" />
        <div className="space-y-2 pt-1">
          <div className="h-4 w-full max-w-lg bg-slate-200/60 rounded" />
          <div className="h-4 w-3/4 bg-slate-200/50 rounded" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-7 w-28 rounded-lg bg-slate-200/60" />
          <div className="h-7 w-32 rounded-lg bg-slate-200/60" />
        </div>
      </div>

      {/* Action / Emission panel skeleton */}
      <div className="h-28 rounded-2xl bg-slate-50 border border-slate-200/60 p-5 space-y-3">
        <div className="h-4 w-44 bg-slate-200/70 rounded" />
        <div className="flex gap-3 pt-1">
          <div className="h-10 w-40 rounded-xl bg-slate-200/80" />
          <div className="h-10 w-36 rounded-xl bg-slate-200/60" />
        </div>
      </div>
      <span className="sr-only">Cargando datos clínicos de la solicitud...</span>
    </div>
  );
}
