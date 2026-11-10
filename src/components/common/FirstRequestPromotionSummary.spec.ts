/** US-016: customer-visible regressions, using the actual React markup. */
import assert from 'node:assert/strict';
import test from 'node:test';
import React, { type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Summary from './FirstRequestPromotionSummary';
import type { PromotionQuote } from '../../types/firstRequestPromotion';
const quote: PromotionQuote = { eligible: true, reason: '', endsAt: '2026-12-16T03:00:00Z', originalAmount: 10000, discount: 10000, finalAmount: 0 };
const props: ComponentProps<typeof Summary> = { showSummary: true, quote, loading: false, error: '', actionError: '', existingOrder: false, canApply: false, onRetry: () => {}, onApply: () => {}, onContinue: () => {} };
const render = (overrides: Partial<ComponentProps<typeof Summary>> = {}) => renderToStaticMarkup(React.createElement(Summary, { ...props, ...overrides }));
test('does not show promotional banners while the summary is hidden', () => {
  for (const state of [{}, { loading: true }, { quote: null }, { error: 'offline' }]) assert.equal(render({ ...state, showSummary: false }), '');
});
test('shows the full discount and zero total in a neutral summary without the removed banner', () => {
  const html = render();
  assert.match(html, /Arancel original/); assert.match(html, /Bonificación primera solicitud/);
  assert.match(html, /\$10\.000/); assert.match(html, /−\$10\.000/); assert.match(html, /Total<\/span><span>\$0/);
  assert.doesNotMatch(html, /Tenés una receta gratis|bg-emerald|border-emerald/);
  assert.doesNotMatch(html, /<button/);
});
test('three medicines show one paid prescription after the discount', () => {
  const html = render({ quote: { ...quote, originalAmount: 20000, finalAmount: 10000 } });
  assert.match(html, /Arancel original<\/span><span>\$20\.000/);
  assert.match(html, /Total<\/span><span>\$10\.000/);
  assert.match(html, /Los medicamentos adicionales se cobran al arancel habitual/);
});
test('a saved free request requires explicit confirmation with the free-submit action', () => {
  const html = render({ existingOrder: true, canApply: true });
  assert.match(html, />Enviar solicitud gratis<\/button>/);
  assert.match(html, /El beneficio se utiliza al confirmar el envío/);
  assert.doesNotMatch(html, /Continuar pago del excedente/);
});
test('a saved request with an excess balance confirms the benefit before payment', () => {
  const html = render({ existingOrder: true, canApply: true, quote: { ...quote, originalAmount: 20000, finalAmount: 10000 } });
  assert.match(html, />Confirmar bonificación y continuar al pago<\/button>/);
  assert.doesNotMatch(html, />Enviar solicitud gratis/);
});
test('an already applied free request cannot consume the benefit again', () => {
  const html = render({ existingOrder: true, canApply: true, quote: { ...quote, applied: true } });
  assert.match(html, /Primera receta bonificada/); assert.doesNotMatch(html, /<button|El beneficio se utiliza al confirmar/);
});
test('a failed provider redirect keeps the discounted balance and offers a payment retry', () => {
  const html = render({ existingOrder: true, canApply: true, actionError: 'No se pudo iniciar el pago.', quote: { ...quote, applied: true, originalAmount: 20000, finalAmount: 10000 } });
  assert.match(html, /role="alert"/); assert.match(html, /No se pudo iniciar el pago/);
  assert.match(html, /Total<\/span><span>\$10\.000/); assert.match(html, />Continuar pago del excedente<\/button>/);
  assert.doesNotMatch(html, /Confirmar bonificación y continuar al pago/);
});
test('photo-only or mixed drafts explain manual loading without claiming a free request', () => {
  const html = render({ quote: { ...quote, eligible: false, reason: 'La promoción requiere carga manual y sin fotos.', discount: 0, finalAmount: 10000 } });
  assert.match(html, /requiere carga manual y sin fotos/); assert.doesNotMatch(html, /Tenés|−\$|Enviar solicitud gratis/);
});
test('ineligible new requests show no promotion and existing requests explain the restriction', () => {
  const denied = { ...quote, eligible: false, reason: 'Ya utilizaste el beneficio.', discount: 0, finalAmount: 10000 };
  assert.equal(render({ quote: denied }), '');
  const html = render({ quote: denied, existingOrder: true, canApply: true });
  assert.match(html, /Ya utilizaste el beneficio/); assert.doesNotMatch(html, /<button|−\$/);
});
test('unknown quotes and loading states never display a misleading zero total', () => {
  assert.equal(render({ quote: null }), '');
  const html = render({ loading: true }); assert.match(html, /role="status"/); assert.doesNotMatch(html, /Total|\$0|<button/);
});
test('quote failures show a retry instead of an old discount or confirmation action', () => {
  const html = render({ error: 'La cotización no está disponible.', existingOrder: true, canApply: true });
  assert.match(html, /role="alert"/); assert.match(html, /Volver a consultar/);
  assert.doesNotMatch(html, /Total|Enviar solicitud gratis|Confirmar bonificación/);
});
