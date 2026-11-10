/** US-016, 2026-11-10: boundary and payment-safety unit tests. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { promotionQuote, hasConfirmedPayment, unsafePayment, assertQuoteConfirmation } from './firstRequestPolicy.js';
import { PROMOTION_END } from '../../src/types/firstRequestPromotion.js';
const config = { firstRequestPromotionEnabled: true, firstRequestPromotionEndsAt: PROMOTION_END };
const now = new Date('2026-11-10T12:00:00Z');
const draft = (count = 2) => ({ medicationMethod: 'manual', medicationItems: Array.from({ length: count }, () => ({ nombreComercial: 'Medicine' })) });
for (const [count, total] of [[1, 0], [2, 0], [3, 10000], [4, 10000], [5, 20000]]) {
  test(`discounts one prescription for ${count} medicines`, () => {
    const q = promotionQuote(config, draft(count), 10000, '', now);
    assert.equal(q.eligible, true); assert.equal(q.discount, 10000); assert.equal(q.finalAmount, total);
  });
}
test('uses tenant tariff and preserves an existing order original amount', () => {
  assert.equal(promotionQuote(config, draft(3), 15000, '', now).finalAmount, 15000);
  const q = promotionQuote(config, { ...draft(3), id: 'REC-1', paymentAmount: '18000' }, 10000, '', now);
  assert.equal(q.originalAmount, 18000); assert.equal(q.finalAmount, 8000);
  assert.equal(promotionQuote(config, { ...draft(), id: 'REC-1', paymentAmount: '5000' }, 10000, '', now).finalAmount, 0);
});
test('ends exclusively at midnight Argentina on December 16', () => {
  assert.equal(promotionQuote(config, draft(), 10000, '', new Date('2026-12-16T02:59:59.999Z')).eligible, true);
  assert.equal(promotionQuote(config, draft(), 10000, '', new Date(PROMOTION_END)).eligible, false);
});
test('defaults off, supports manual off and rejects invalid expiry', () => {
  for (const c of [undefined, {}, { ...config, firstRequestPromotionEnabled: false }, { ...config, firstRequestPromotionEndsAt: 'invalid' }]) {
    assert.equal(promotionQuote(c, draft(), 10000, '', now).eligible, false);
  }
});
test('excludes empty manual lists, photos, legacy photos and mixed loading', () => {
  for (const d of [draft(0), { ...draft(), medicationMethod: 'foto' }, { ...draft(), medicationPhotos: [{}] }, { ...draft(), medicationPhotoUrl: 'https://example.test/a' }, { ...draft(), medicationItems: [{ photoUrl: 'photo' }] }]) {
    const q = promotionQuote(config, d, 10000, '', now); assert.equal(q.eligible, false); assert.equal(q.discount, 0);
  }
});
test('rejects zero/invalid tariffs and zero/invalid existing prices', () => {
  for (const n of [0, -1, NaN, Infinity]) assert.equal(promotionQuote(config, draft(), n, '', now).eligible, false);
  for (const amount of ['0', '-1', 'bad']) assert.equal(promotionQuote(config, { ...draft(), id: 'x', paymentAmount: amount }, 10000, '', now).eligible, false);
});
test('counts confirmed payments through all payment methods including refunds', () => {
  for (const paymentMethod of ['mp', 'transfer', 'cash_desk']) for (const paymentStatus of ['approved', 'refunded']) {
    assert.equal(hasConfirmedPayment({ paymentMethod, paymentStatus, paymentAmount: '10000' }), true);
  }
  for (const paymentStatus of ['pending', 'rejected', 'exempt']) assert.equal(hasConfirmedPayment({ paymentMethod: 'mp', paymentStatus, paymentAmount: '10000' }), false);
  assert.equal(hasConfirmedPayment({ paymentMethod: 'bonificado', paymentStatus: 'approved', paymentAmount: '0' }), false);
});
test('fails closed for unknown legacy checkouts, initiated payments and pending receipts', () => {
  for (const o of [{ paymentMethod: 'mp' }, { paymentMethod: 'mp', paymentStage: 'checkout_started' }, { paymentMethod: 'mp', paymentStage: 'not_started', checkoutEverStarted: true }, { paymentMethod: 'transfer', paymentReceiptUrl: 'receipt' }, { paymentMethod: 'transfer', paymentStage: 'awaiting_validation' }]) {
    assert.equal(unsafePayment({ paymentStatus: 'pending', ...o }), true);
  }
  assert.equal(unsafePayment({ paymentMethod: 'mp', paymentStatus: 'pending', paymentStage: 'not_started' }), false);
});
test('requires exact explicit amounts and refuses silent full-price fallback', () => {
  const q = promotionQuote(config, draft(3), 10000, '', now);
  assert.doesNotThrow(() => assertQuoteConfirmation(q, q));
  for (const c of [undefined, {}, { ...q, discount: 20000 }, { ...q, finalAmount: 0 }, { ...q, originalAmount: 10000 }]) assert.throws(() => assertQuoteConfirmation(q, c), { status: 409 });
  assert.throws(() => assertQuoteConfirmation({ ...q, eligible: false }, q), { status: 409 });
});
test('starts inclusively at midnight Argentina on the configured first day', () => {
  const scheduled = { ...config, firstRequestPromotionStartsAt: '2026-12-01T03:00:00.000Z' };
  assert.equal(promotionQuote(scheduled, draft(), 10000, '', new Date('2026-12-01T02:59:59.999Z')).eligible, false);
  assert.equal(promotionQuote(scheduled, draft(), 10000, '', new Date('2026-12-01T03:00:00.000Z')).eligible, true);
});
test('invalid, reversed and empty configured intervals never offer a discount', () => {
  for (const startsAt of ['invalid', PROMOTION_END, '2027-01-01T03:00:00Z']) {
    assert.equal(promotionQuote({ ...config, firstRequestPromotionStartsAt: startsAt }, draft(), 10000, '', now).eligible, false);
  }
});
test('a promotion can run for a single inclusive calendar day', () => {
  const oneDay = { ...config, firstRequestPromotionStartsAt: '2026-12-15T03:00:00.000Z' };
  assert.equal(promotionQuote(oneDay, draft(), 10000, '', new Date('2026-12-15T03:00:00.000Z')).eligible, true);
  assert.equal(promotionQuote(oneDay, draft(), 10000, '', new Date('2026-12-16T02:59:59.999Z')).eligible, true);
  assert.equal(promotionQuote(oneDay, draft(), 10000, '', new Date(PROMOTION_END)).eligible, false);
});
