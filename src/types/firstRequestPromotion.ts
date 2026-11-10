/** US-016, 2026-11-10: shared server quote and persisted promotion snapshot. */
export const PROMOTION_START = '2026-11-10T03:00:00.000Z';
export const PROMOTION_END = '2026-12-16T03:00:00.000Z';
export interface FirstRequestBenefit {
  beneficiaryId: string;
  appliedAt: string;
  originalAmount: number;
  discount: number;
  finalAmount: number;
}
export interface PromotionQuote {
  eligible: boolean;
  reason: string;
  startsAt?: string;
  endsAt: string;
  originalAmount: number;
  discount: number;
  finalAmount: number;
  applied?: boolean;
}
