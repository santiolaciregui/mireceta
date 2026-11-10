/** US-016, 2026-11-10: explicit discount preview for new and resumed requests. */
import React, { useEffect, useState } from 'react';
import FirstRequestPromotionSummary from './FirstRequestPromotionSummary';
import type { PromotionQuote } from '../../types/firstRequestPromotion';
import { apiFetchJson } from '../../services/api';
import { quotePromotion, applyPromotion } from '../../services/firstRequestPromotion';
export default function FirstRequestPromotion({ data, onQuote, onApplied, refresh = 0, showSummary = true }: {
  data: any; onQuote?: (quote: PromotionQuote | null) => void; onApplied?: (order: any) => void; refresh?: number; showSummary?: boolean;
}) {
  const [quote, setQuote] = useState<PromotionQuote | null>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const input = JSON.stringify(data);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setQuote(null); onQuote?.(null);
    quotePromotion(JSON.parse(input)).then(q => {
      if (active) { setQuote(q); onQuote?.(q); }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [input, retry, refresh, onQuote]);
  const continuePayment = async () => {
    const result = await apiFetchJson<any>('/api/payments/create-preference', { method: 'POST', body: JSON.stringify({ orderId: data.orderId, origin: window.location.origin }) });
    if (result.alreadyPaid) { onApplied?.(result.order); return; }
    if (!result.initPoint) throw new Error('No se pudo iniciar el pago del excedente.');
    window.location.href = result.initPoint;
  };
  const apply = async () => {
    if (!quote || loading) return;
    setLoading(true); setActionError('');
    try { const order = await applyPromotion(data.orderId, quote); onApplied?.(order); setRetry(n => n + 1); if (Number(order.paymentAmount) > 0) await continuePayment(); }
    catch (e: any) { setActionError(e.message); setRetry(n => n + 1); }
    finally { setLoading(false); }
  };
  return <FirstRequestPromotionSummary
    showSummary={showSummary} quote={quote} loading={loading} error={error} actionError={actionError}
    existingOrder={Boolean(data.orderId)} canApply={Boolean(onApplied)} onRetry={() => setRetry(n => n + 1)}
    onApply={apply} onContinue={async () => {
      setLoading(true);
      try { await continuePayment(); } catch (e: any) { setActionError(e.message); } finally { setLoading(false); }
    }} />;
}
