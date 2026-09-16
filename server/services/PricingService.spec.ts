import assert from 'node:assert/strict';
import test from 'node:test';
import { PricingService } from './PricingService.js';

test('charges the configured prescription price for PAMI coverage', () => {
  const result = PricingService.calculatePrice({
    obraSocial: 'PAMI (Inssjp)',
    paymentMethod: 'mp',
    medicationItems: [{ nombreComercial: 'Medication A' }],
    basePricePerPrescription: 12500,
  });

  assert.equal(result.amount, 12500);
  assert.equal(result.amountFormatted, '12500');
  assert.equal(result.isExempt, false);
  assert.equal(result.breakdown, '1 receta(s) x $12.500');
});

test('uses the same prescription calculation for IOMA coverage', () => {
  const result = PricingService.calculatePrice({
    obraSocial: 'IOMA',
    paymentMethod: 'mp',
    medicationItems: [
      { nombreComercial: 'Medication A' },
      { nombreComercial: 'Medication B' },
      { nombreComercial: 'Medication C' },
    ],
    basePricePerPrescription: 10000,
  });

  assert.equal(result.amount, 20000);
  assert.equal(result.prescriptionCount, 2);
  assert.equal(result.isExempt, false);
});

test('keeps explicitly bonified orders exempt regardless of coverage', () => {
  const result = PricingService.calculatePrice({
    obraSocial: 'PAMI (Inssjp)',
    paymentMethod: 'bonificado',
    medicationItems: [{ nombreComercial: 'Medication A' }],
  });

  assert.equal(result.amount, 0);
  assert.equal(result.amountFormatted, '0');
  assert.equal(result.isExempt, true);
  assert.equal(result.breakdown, 'Arancel bonificado');
});
