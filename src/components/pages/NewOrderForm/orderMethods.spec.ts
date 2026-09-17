/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterPatientOrders,
  getRepeatableOrderData,
  getPastOrderDisplaySummary,
} from './orderMethods.js';

describe('NewOrderForm order methods and repeating past orders', () => {
  const sampleOrders = [
    {
      id: 'REC-001',
      patientDni: '30123456',
      createdAt: '2026-08-10T10:00:00.000Z',
      diagnostic: 'Hipertensión arterial',
      comments: 'Tomar por la mañana',
      medicationItems: [
        {
          nombreComercial: 'Losartán',
          miligramos: '50mg',
          presentacion: 'Comprimidos',
          cantidadCajas: 2,
        },
      ],
    },
    {
      id: 'REC-002',
      patientDni: ' 30123456 ',
      createdAt: '2026-09-01T14:30:00.000Z',
      diagnostic: 'Hipertensión y dislipemia',
      comments: 'Control mensual',
      medicationItems: [
        {
          nombreComercial: 'Losartán',
          miligramos: '50mg',
          presentacion: 'Comprimidos',
          cantidadCajas: 1,
        },
        {
          nombreComercial: 'Atorvastatina',
          miligramos: '20mg',
          presentacion: 'Comprimidos',
          cantidadCajas: 1,
        },
      ],
    },
    {
      id: 'REC-003',
      patientDni: '40999888',
      createdAt: '2026-09-15T09:00:00.000Z',
      diagnostic: 'Asma bronquial',
      medicationItems: [],
      medicationPhotos: [
        {
          url: 'data:image/png;base64,sample',
          name: 'receta_salbutamol.png',
          cantidadCajas: 1,
        },
      ],
    },
  ];

  it('filters orders by patient DNI and sorts newest first', () => {
    const results = filterPatientOrders(sampleOrders, '30123456');
    assert.equal(results.length, 2);
    // Newest first: REC-002 (Sept 1) before REC-001 (Aug 10)
    assert.equal(results[0].id, 'REC-002');
    assert.equal(results[1].id, 'REC-001');
  });

  it('returns empty array when DNI does not match or is empty', () => {
    assert.deepEqual(filterPatientOrders(sampleOrders, ''), []);
    assert.deepEqual(filterPatientOrders(sampleOrders, '99999999'), []);
    assert.deepEqual(filterPatientOrders([], '30123456'), []);
  });

  it('extracts repeatable data cleanly without mutating original order', () => {
    const targetOrder = sampleOrders[1];
    const data = getRepeatableOrderData(targetOrder);

    assert.equal(data.diagnostic, 'Hipertensión y dislipemia');
    assert.equal(data.comments, 'Control mensual');
    assert.equal(data.medicationItems.length, 2);
    assert.equal(data.medicationItems[0].nombreComercial, 'Losartán');
    assert.equal(data.medicationItems[1].nombreComercial, 'Atorvastatina');

    // Mutating extracted data should not affect original order
    data.medicationItems[0].cantidadCajas = 99;
    assert.equal(targetOrder.medicationItems[0].cantidadCajas, 1);
  });

  it('extracts repeatable photo data correctly', () => {
    const photoOrder = sampleOrders[2];
    const data = getRepeatableOrderData(photoOrder);

    assert.equal(data.diagnostic, 'Asma bronquial');
    assert.equal(data.medicationItems.length, 0);
    assert.equal(data.medicationPhotos.length, 1);
    assert.equal(data.medicationPhotos[0].name, 'receta_salbutamol.png');
    assert.equal(data.medicationPhotos[0].cantidadCajas, 1);
  });

  it('handles null or empty order gracefully in getRepeatableOrderData', () => {
    const emptyData = getRepeatableOrderData(null);
    assert.deepEqual(emptyData.medicationItems, []);
    assert.deepEqual(emptyData.medicationPhotos, []);
    assert.equal(emptyData.diagnostic, '');
    assert.equal(emptyData.comments, '');
  });

  it('generates informative display summaries for past orders', () => {
    const summary1 = getPastOrderDisplaySummary(sampleOrders[1]);
    assert.match(summary1, /Hipertensión y dislipemia/);
    assert.match(summary1, /2 medicamentos/);

    const summaryPhoto = getPastOrderDisplaySummary(sampleOrders[2]);
    assert.match(summaryPhoto, /Asma bronquial/);
    assert.match(summaryPhoto, /1 receta\/foto/);
  });
});
