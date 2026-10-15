import assert from 'node:assert/strict';
import test from 'node:test';
import { applyPatientRecordToOrder, type SavedPatientRecord } from './patientRecordUpdate';
import type { MedicalOrder } from '../types';

const patient: SavedPatientRecord = {
  id: 'PAT-real', userId: 'USR-real', previousDni: '30111222', dni: '30999888',
  name: 'Juan', lastName: 'Perez', phone: '1122334455', obraSocial: 'OSDE',
};

test('updates all personal requests while preserving cached chat and issued PDF', () => {
  const order = { id: 'closed', patientDni: '30.111.222', status: 'Emitida', recipePdfUrl: 'issued.pdf', messages: [{ id: 'chat' }] } as MedicalOrder;
  const updated = applyPatientRecordToOrder(order, patient);
  assert.equal(updated.patientDni, patient.dni);
  assert.equal(updated.status, 'Emitida');
  assert.equal(updated.recipePdfUrl, order.recipePdfUrl);
  assert.equal(updated.messages, order.messages);
  assert.equal(order.patientDni, '30.111.222');
});

test('updates the titular reference without changing dependent identity or insurance', () => {
  const order = { patientDni: '40123456', patientName: 'Hija', requestedByTitularDni: '30111222', isForDependent: true, obraSocial: 'IOMA' } as MedicalOrder;
  const updated = applyPatientRecordToOrder(order, patient);
  assert.equal(updated.requestedByTitularDni, patient.dni);
  assert.equal(updated.requestedByTitularPhone, patient.phone);
  assert.equal(updated.patientDni, order.patientDni);
  assert.equal(updated.patientName, order.patientName);
  assert.equal(updated.obraSocial, order.obraSocial);
});

test('does not absorb requests found only under the new DNI', () => {
  const order = { patientDni: patient.dni } as MedicalOrder;
  assert.equal(applyPatientRecordToOrder(order, patient), order);
});

test('supports another edit after the account DNI changed', () => {
  const order = { patientDni: patient.previousDni } as MedicalOrder;
  const first = applyPatientRecordToOrder(order, patient);
  const second = applyPatientRecordToOrder(first, { ...patient, previousDni: patient.dni, phone: '1199887766' });
  assert.equal(second.patientDni, patient.dni);
  assert.equal(second.patientPhone, '1199887766');
});
