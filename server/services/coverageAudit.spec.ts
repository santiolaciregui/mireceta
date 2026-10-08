import assert from 'node:assert/strict';
import test from 'node:test';
import { coverageChange, validateCoverageConfirmation } from './coverageAudit.js';

test('coverage confirmation preserves the exact coverage confirmed before payment', () => {
  const confirmed = validateCoverageConfirmation({
    source: 'patient_form',
    obraSocial: ' FEMEDICA - PLAN 3000 ',
    obraSocialNumber: ' 01-123 ',
    confirmedAt: '2026-10-08T01:40:00.000Z',
    draftRestored: true,
    history: [{ event: 'draft_restored', at: '2026-10-08T01:30:00.000Z', obraSocial: 'PAMI', obraSocialNumber: '105/00' }],
  }, { obraSocial: 'FEMEDICA - PLAN 3000', obraSocialNumber: '01-123' });

  assert.deepEqual(confirmed, {
    source: 'patient_form',
    obraSocial: 'FEMEDICA - PLAN 3000',
    obraSocialNumber: '01-123',
    confirmedAt: '2026-10-08T01:40:00.000Z',
    draftRestored: true,
    history: [{ event: 'draft_restored', at: '2026-10-08T01:30:00.000Z', obraSocial: 'PAMI', obraSocialNumber: '105/00' }],
  });
});

test('coverage confirmation rejects a stale form value', () => {
  assert.throws(() => validateCoverageConfirmation({
    source: 'patient_form',
    obraSocial: 'FEMEDICA - PLAN 3000',
    obraSocialNumber: '01-123',
    confirmedAt: '2026-10-08T01:40:00.000Z',
    draftRestored: false,
  }, { obraSocial: 'PAMI (Inssjp)', obraSocialNumber: '105/00' }), /no coincide/);
});

test('legacy clients are accepted without fabricated confirmation evidence', () => {
  assert.equal(validateCoverageConfirmation(undefined, { obraSocial: 'PAMI (Inssjp)' }), null);
});

test('coverage history rejects unsupported events and oversized payloads', () => {
  const base = {
    source: 'patient_form', obraSocial: 'OSDE', obraSocialNumber: '123',
    confirmedAt: '2026-10-08T01:40:00.000Z', draftRestored: false,
  };
  assert.throws(() => validateCoverageConfirmation({ ...base, history: [{ event: 'other', at: base.confirmedAt }] }, base), /historial/);
  assert.throws(() => validateCoverageConfirmation({ ...base, history: Array(26).fill({ event: 'selection_changed', at: base.confirmedAt }) }, base), /historial/);
});

test('coverage change records both previous and new membership details', () => {
  assert.deepEqual(coverageChange(
    { obraSocial: 'PAMI (Inssjp)', obraSocialNumber: '105/00' },
    { obraSocial: 'FEMEDICA - PLAN 3000', obraSocialNumber: '01-123' },
  ), {
    before: { obraSocial: 'PAMI (Inssjp)', obraSocialNumber: '105/00' },
    after: { obraSocial: 'FEMEDICA - PLAN 3000', obraSocialNumber: '01-123' },
  });
  assert.equal(coverageChange({ obraSocial: 'PAMI' }, { obraSocial: ' PAMI ' }), null);
});
