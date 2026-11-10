/** US-016, 2026-11-10: pure pricing and eligibility rules. */
import { PROMOTION_START, PROMOTION_END, type PromotionQuote } from '../../src/types/firstRequestPromotion.js';
export function promotionQuote(config: any, order: any, basePrice: number, reason = '', now = new Date()): PromotionQuote {
  const startsAt = config?.firstRequestPromotionStartsAt || PROMOTION_START;
  const endsAt = config?.firstRequestPromotionEndsAt || PROMOTION_END;
  const count = Array.isArray(order?.medicationItems) ? order.medicationItems.length : 0;
  const originalAmount = order?.id ? Number(order.paymentAmount) : Math.max(1, Math.ceil((count + (order?.medicationPhotos?.length || 0)) / 2)) * basePrice;
  if (!reason && (!config?.firstRequestPromotionEnabled || !(Date.parse(startsAt) < Date.parse(endsAt) && now.getTime() >= Date.parse(startsAt) && now.getTime() < Date.parse(endsAt)))) reason = 'La promoción no está vigente.';
  if (!reason && (order?.medicationMethod !== 'manual' || !count || order?.medicationPhotos?.length || order?.medicationPhotoUrl || order?.medicationItems?.some((item: any) => item.photoUrl))) reason = 'La promoción requiere medicamentos con carga manual y sin fotos.';
  if (!reason && (!Number.isFinite(originalAmount) || originalAmount <= 0 || !Number.isFinite(basePrice) || basePrice <= 0)) reason = 'Esta solicitud no tiene un arancel válido para bonificar.';
  const eligible = !reason;
  const discount = eligible ? Math.min(originalAmount, basePrice) : 0;
  return { eligible, reason, startsAt, endsAt, originalAmount, discount, finalAmount: originalAmount - discount };
}
export function hasConfirmedPayment(order: any): boolean {
  return ['approved', 'refunded'].includes(order.paymentStatus) && order.paymentMethod !== 'bonificado' && Number(order.paymentAmount) > 0;
}
export function unsafePayment(order: any): boolean {
  if (['approved', 'refunded', 'exempt'].includes(order.paymentStatus)) return false;
  if (order.paymentReceiptUrl || order.paymentStage === 'awaiting_validation') return true;
  // Old Checkout Pro links cannot reliably be revoked; require review, never guess.
  return order.paymentMethod === 'mp' && (order.paymentStage !== 'not_started' || !!order.checkoutEverStarted);
}
export function assertQuoteConfirmation(quote: PromotionQuote, confirmation: any) {
  if (!quote.eligible || !confirmation || ['originalAmount', 'discount', 'finalAmount'].some(k => confirmation[k] !== quote[k as keyof PromotionQuote])) {
    throw Object.assign(new Error('La bonificación o el arancel cambió. Revisá el resumen y confirmá nuevamente.'), { status: 409 });
  }
}
