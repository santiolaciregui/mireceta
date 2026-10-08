import assert from 'node:assert/strict';
import test from 'node:test';
import { auditLogService } from './AuditLogService.js';
import { UserService } from './UserService.js';

test('user coverage edits audit the previous and new coverage', async () => {
  const service: any = new UserService();
  const originalLog = auditLogService.log;
  let logged: any;
  service.userRepo = {
    findById: async () => ({
      id: 'USR-1', role: 'paciente', tenantId: 'TEN-1',
      identifier: '12345678', name: 'Sara', lastName: 'Test',
      obraSocial: 'PAMI (Inssjp)', obraSocialNumber: '105/00',
    }),
    update: async (_id: string, value: any) => ({
      id: 'USR-1', role: 'paciente', tenantId: 'TEN-1',
      identifier: '12345678', name: 'Sara', lastName: 'Test',
      ...value,
    }),
  };
  service.patientService = { createOrUpdatePatient: async () => undefined };
  auditLogService.log = async (entry: any) => { logged = entry; };

  try {
    await service.updateUser('USR-1', {
      obraSocial: 'FEMEDICA - PLAN 3000',
      obraSocialNumber: '01-123',
    }, { id: 'USR-1', role: 'paciente', tenantId: 'TEN-1' });
    assert.deepEqual(logged.changes.coverage, {
      before: { obraSocial: 'PAMI (Inssjp)', obraSocialNumber: '105/00' },
      after: { obraSocial: 'FEMEDICA - PLAN 3000', obraSocialNumber: '01-123' },
    });
  } finally {
    auditLogService.log = originalLog;
  }
});

test('user coverage change remains audited when patient record synchronization fails', async () => {
  const service: any = new UserService();
  const originalLog = auditLogService.log;
  let logged: any;
  service.userRepo = {
    findById: async () => ({ id: 'USR-1', role: 'paciente', tenantId: 'TEN-1', obraSocial: 'PAMI', obraSocialNumber: '105/00' }),
    update: async () => ({ id: 'USR-1', role: 'paciente', tenantId: 'TEN-1', obraSocial: 'FEMEDICA', obraSocialNumber: '01-123' }),
  };
  service.patientService = { createOrUpdatePatient: async () => { throw new Error('sync unavailable'); } };
  auditLogService.log = async (entry: any) => { logged = entry; };

  try {
    await assert.rejects(() => service.updateUser('USR-1', { obraSocial: 'FEMEDICA' }, { id: 'USR-1', role: 'paciente', tenantId: 'TEN-1' }), /sync unavailable/);
    assert.equal(logged.action, 'USER_UPDATE');
    assert.equal(logged.changes.coverage.after.obraSocial, 'FEMEDICA');
  } finally {
    auditLogService.log = originalLog;
  }
});
