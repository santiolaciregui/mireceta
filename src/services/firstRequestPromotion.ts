/** US-016, 2026-11-10: server-owned quotes; confirmed amounts never come from client pricing. */
import { apiFetchJson } from './api';
import type { PromotionQuote } from '../types/firstRequestPromotion';
export const quotePromotion = (data: any) => apiFetchJson<PromotionQuote>('/api/first-request-promotion/quote', { method: 'POST', body: JSON.stringify(data), cache: 'no-store' });
export const applyPromotion = (orderId: string, confirmation: PromotionQuote) => apiFetchJson<any>(`/api/first-request-promotion/apply/${encodeURIComponent(orderId)}`, { method: 'POST', body: JSON.stringify({ confirmation }) });
