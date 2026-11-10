/** US-016: pure presentation, rendered in unit tests without effects or a browser. */
import React from 'react';
import type { PromotionQuote } from '../../types/firstRequestPromotion';
interface SummaryProps {
  showSummary: boolean;
  quote: PromotionQuote | null;
  loading: boolean;
  error: string;
  actionError: string;
  existingOrder: boolean;
  canApply: boolean;
  onRetry: () => void;
  onApply: () => void;
  onContinue: () => void;
}
export default function FirstRequestPromotionSummary({ showSummary, quote, loading, error, actionError,
  existingOrder, canApply, onRetry, onApply, onContinue }: SummaryProps) {
  if (!showSummary) return null;
  if (error) return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">{error} <button type="button" onClick={onRetry} className="underline font-semibold">Volver a consultar</button></div>;
  if (loading) return <p className="text-sm text-slate-500" role="status">Consultando bonificación…</p>;
  if (!quote) return null;
  if (!quote.eligible) {
    if (quote.reason.includes('carga manual')) return <p className="rounded-xl bg-blue-50 p-4 text-sm">La bonificación requiere carga manual y sin fotos. Los medicamentos adicionales se cobran al arancel habitual.</p>;
    return existingOrder ? <p className="text-sm text-slate-500">{quote.reason}</p> : null;
  }
  return <section aria-label="Bonificación primera solicitud" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 space-y-2">
    <p className="font-bold">{quote.applied ? 'Primera receta bonificada' : 'Bonificación primera solicitud'}</p>
    {actionError && <p role="alert">{actionError}</p>}
    <><div className="flex justify-between"><span>Arancel original</span><span>${quote.originalAmount.toLocaleString('es-AR')}</span></div>
    <div className="flex justify-between"><span>Bonificación primera solicitud</span><span>−${quote.discount.toLocaleString('es-AR')}</span></div>
    <div className="flex justify-between font-bold"><span>Total</span><span>${quote.finalAmount.toLocaleString('es-AR')}</span></div></>
    {!quote.applied && <p>El beneficio se utiliza al confirmar el envío, aunque después se cancele o rechace. Los medicamentos adicionales se cobran al arancel habitual.</p>}
    {existingOrder && quote.applied && quote.finalAmount > 0 && <button type="button" disabled={loading} onClick={onContinue} className="rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-50">Continuar pago del excedente</button>}
    {existingOrder && canApply && !quote.applied && <button type="button" disabled={loading} onClick={onApply} className="rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-50">{quote.finalAmount === 0 ? 'Enviar solicitud gratis' : 'Confirmar bonificación y continuar al pago'}</button>}
  </section>;
}
