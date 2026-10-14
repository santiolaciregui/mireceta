import type { MouseEvent } from 'react';
import { Check, ChevronDown, Edit3, Trash2 } from 'lucide-react';

interface PatientSelectionCardProps {
  key?: string;
  name: string;
  relationship: string;
  dni: string;
  phone?: string;
  obraSocial?: string;
  obraSocialNumber?: string;
  birthDate?: string;
  email?: string;
  city?: string;
  province?: string;
  selected: boolean;
  onSelect: () => void;
  onEdit: (event: MouseEvent<HTMLButtonElement>) => void;
  onRemove?: (event: MouseEvent<HTMLButtonElement>) => void;
}

const displayValue = (value?: string) => value?.trim() || 'Sin registrar';

export default function PatientSelectionCard({
  name,
  relationship,
  dni,
  phone,
  obraSocial,
  obraSocialNumber,
  birthDate,
  email,
  city,
  province,
  selected,
  onSelect,
  onEdit,
  onRemove,
}: PatientSelectionCardProps) {
  const location = [city, province].filter(Boolean).join(', ');

  return (
    <article
      className={`min-w-0 self-start overflow-hidden rounded-2xl transition-colors ${
        selected
          ? 'border-2 border-[#1661E1] bg-blue-50/60 ring-4 ring-[#1E6EFB]/15 shadow-md'
          : 'border border-slate-200 bg-white shadow-xs'
      }`}
    >
      <div className="p-4 sm:p-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full border border-[#1661E1]/20 bg-[#1661E1]/10 px-2.5 py-1 text-xs font-bold text-[#0141BC]">
            {relationship}
          </span>
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            aria-label={`${selected ? 'Seleccionado' : 'Seleccionar'}: ${name}`}
            className={`inline-flex min-h-11 items-center gap-1 rounded-full px-3 py-2 text-xs font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1661E1] ${
              selected
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-blue-100 text-[#0141BC] hover:bg-blue-200'
            }`}
          >
            {selected && <Check className="h-4 w-4" aria-hidden="true" />}
            {selected ? 'Seleccionado' : 'Seleccionar'}
          </button>
        </div>

        <h5 className="mt-3 break-words text-lg font-black leading-tight text-[#0141BC]">{name}</h5>

        <dl className="mt-4 grid grid-cols-2 gap-x-3 border-t border-slate-200">
          {[
            ['DNI', dni],
            ['Teléfono', phone],
            ['Obra social', obraSocial],
            ['Credencial', obraSocialNumber],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 border-b border-slate-100 py-2.5 last:border-b-0 [&:nth-last-child(2)]:border-b-0">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</dt>
              <dd className="mt-1 break-words text-sm font-bold leading-snug text-slate-800">{displayValue(value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <details className="group border-t border-slate-200">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm font-bold text-[#0141BC] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1661E1] [&::-webkit-details-marker]:hidden">
          Ver todos los datos
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="px-4 pb-4">
          <dl className="divide-y divide-slate-100">
            {[
              ['Fecha de nacimiento', birthDate],
              ['Email', email],
              ['Ciudad / provincia', location],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-x-3 gap-y-1 py-2.5 text-xs">
                <dt className="font-semibold text-slate-600">{label}</dt>
                <dd className="max-w-full break-all text-right font-bold text-slate-800">{displayValue(value)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#0141BC] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1661E1]"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
              Editar datos
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Eliminar familiar
              </button>
            )}
          </div>
        </div>
      </details>
    </article>
  );
}
