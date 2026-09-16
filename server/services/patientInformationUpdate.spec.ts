/**
 * File: patientInformationUpdate.spec.ts
 * Date: 2026-09-16
 * Description: Unit tests for patient information normalization, validation, change detection, and OrderService integration.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasPatientInformationUpdate,
  isAuthorizedToEditPatient,
  validateAndNormalizePatientInformation,
  getPatientChangeSummary,
} from './patientInformationUpdate.js';
import { OrderService } from './OrderService.js';
import { auditLogService } from './AuditLogService.js';

test('detects patient information fields without matching unrelated updates', () => {
  assert.equal(hasPatientInformationUpdate({ patientName: 'Juan' }), true);
  assert.equal(hasPatientInformationUpdate({ obraSocialNumber: '123456789' }), true);
  assert.equal(hasPatientInformationUpdate({ phone: '1122334455' }), true);
  assert.equal(hasPatientInformationUpdate({ doctorNotes: 'Checked' }), false);
  assert.equal(hasPatientInformationUpdate({ recipePdfUrl: 'http://example.com' }), false);
});

test('authorizes colaborador, medico, and admin but rejects paciente', () => {
  assert.equal(isAuthorizedToEditPatient('colaborador'), true);
  assert.equal(isAuthorizedToEditPatient('medico'), true);
  assert.equal(isAuthorizedToEditPatient('admin'), true);
  assert.equal(isAuthorizedToEditPatient('superadmin'), true);
  assert.equal(isAuthorizedToEditPatient('paciente'), false);
  assert.equal(isAuthorizedToEditPatient(undefined), false);
});

test('normalizes patient fields and cleans DNI and phone', () => {
  const result = validateAndNormalizePatientInformation({
    name: '  Carlos  ',
    lastName: '  Gómez  ',
    dni: ' 35.123.456 ',
    phone: '+54 9 11 2345-6789',
    email: ' CARLOS@Example.com ',
    obraSocial: 'OSDE',
    obraSocialNumber: ' 1234567 ',
    city: ' Tandil ',
    province: ' Buenos Aires ',
  });

  assert.equal(result.name, 'Carlos');
  assert.equal(result.lastName, 'Gómez');
  assert.equal(result.dni, '35123456');
  assert.equal(result.phone, '5491123456789');
  assert.equal(result.email, 'carlos@example.com');
  assert.equal(result.obraSocial, 'OSDE');
  assert.equal(result.obraSocialNumber, '1234567');
  assert.equal(result.city, 'Tandil');
  assert.equal(result.province, 'Buenos Aires');
});

test('throws error if name, lastName, or DNI is invalid', () => {
  assert.throws(
    () => validateAndNormalizePatientInformation({ name: '', lastName: 'Perez', dni: '12345678' }),
    /El nombre del paciente es obligatorio/
  );
  assert.throws(
    () => validateAndNormalizePatientInformation({ name: 'Juan', lastName: '', dni: '12345678' }),
    /El apellido del paciente es obligatorio/
  );
  assert.throws(
    () => validateAndNormalizePatientInformation({ name: 'Juan', lastName: 'Perez', dni: '123' }),
    /El DNI debe contener al menos 6 dígitos/
  );
  assert.throws(
    () => validateAndNormalizePatientInformation({ name: 'Juan', lastName: 'Perez', dni: '12345678', email: 'not-an-email' }),
    /El formato del correo electrónico no es válido/
  );
});

test('generates human-readable summary of modified patient fields', () => {
  const before = {
    name: 'Juan',
    lastName: 'Perez',
    dni: '30111222',
    phone: '1144445555',
    obraSocial: 'Particular',
    obraSocialNumber: '',
  };
  const after = validateAndNormalizePatientInformation({
    name: 'Juan',
    lastName: 'Pérez',
    dni: '30111222',
    phone: '1199998888',
    obraSocial: 'Swiss Medical',
    obraSocialNumber: '998877',
  });

  const summary = getPatientChangeSummary(before, after);
  assert.match(summary, /Apellido: "Perez" → "Pérez"/);
  assert.match(summary, /Teléfono: "1144445555" → "1199998888"/);
  assert.match(summary, /Obra Social: "Particular" → "Swiss Medical"/);
  assert.match(summary, /Nº Afiliado: "vacío" → "998877"/);
});

test('persists and audits collaborator patient information corrections on orders', async () => {
  const service: any = new OrderService();
  const order: any = {
    id: 'ORD-PAT-1',
    tenantId: 'TEN-100',
    patientName: 'Martin',
    patientLastName: 'Gonzalez',
    patientDni: '32111222',
    patientBirthDate: '1988-02-10',
    patientPhone: '1122334455',
    patientEmail: 'martin@example.com',
    obraSocial: 'Particular',
    status: 'Pendiente',
    auditLog: [],
  };

  let persisted: any;
  let globalAudit: any;
  const originalAuditLog = auditLogService.log;

  service.orderRepo = {
    findById: async () => order,
    update: async (_id: string, value: any) => {
      persisted = value;
      return value;
    },
  };
  service.patientService = {
    createOrUpdatePatient: async () => undefined,
  };
  service.refreshPendingOrderLimitAlert = async () => undefined;
  auditLogService.log = async (entry: any) => {
    globalAudit = entry;
  };

  try {
    const result = await service.updateOrder(
      'ORD-PAT-1',
      {
        patientName: 'Martín',
        patientLastName: 'González',
        patientDni: '32.111.222',
        patientPhone: '1199887766',
        obraSocial: 'OSDE',
        obraSocialNumber: '88776655',
      },
      { id: 'COLAB-1', role: 'colaborador', name: 'Laura', lastName: 'Recepción', tenantId: 'TEN-100' }
    );

    assert.equal(result, persisted);
    assert.equal(persisted.patientName, 'Martín');
    assert.equal(persisted.patientLastName, 'González');
    assert.equal(persisted.patientDni, '32111222');
    assert.equal(persisted.patientPhone, '1199887766');
    assert.equal(persisted.obraSocial, 'OSDE');
    assert.equal(persisted.obraSocialNumber, '88776655');
    assert.equal(persisted.auditLog.at(-1).action, 'Datos del paciente actualizados');
    assert.equal(globalAudit.action, 'ORDER_PATIENT_UPDATE');
  } finally {
    auditLogService.log = originalAuditLog;
  }
});

test('rejects patient corrections from unauthorized roles', async () => {
  const service: any = new OrderService();
  service.orderRepo = {
    findById: async () => ({
      id: 'ORD-PAT-2',
      tenantId: 'TEN-100',
      patientDni: '32111222',
      status: 'Pendiente',
    }),
  };

  // Test with non-staff role
  await assert.rejects(
    () => service.updateOrder(
      'ORD-PAT-2',
      { patientName: 'Nuevo' },
      { id: 'OPER-1', role: 'invitado', identifier: '999999', name: 'Invitado', lastName: 'Test' }
    ),
    /Solo los colaboradores, médicos y administradores/
  );
});
