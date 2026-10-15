import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { PatientService } from './PatientService.js';
import { AuthService } from './AuthService.js';
import { AuditLogService, auditLogService } from './AuditLogService.js';

const staff = { id: 'COL-1', name: 'Ana', lastName: 'Operadora', role: 'colaborador', tenantId: 'TEN-1' };
const oldDni = '30111222';
const newDni = '30999888';
const clean = (value: string) => value.replace(/\D/g, '');
const doc = (value: any) => Object.assign(value, { toObject() { const { toObject, ...plain } = this; return { ...plain }; } });

function fixture(options: { noPatient?: boolean; noUser?: boolean } = {}) {
  const state = {
    patient: options.noPatient ? null : doc({ id: 'PAT-real', dni: oldDni, name: 'Juan', lastName: 'Perez', userId: options.noUser ? undefined : 'USR-real', tenantId: 'TEN-1', messages: [{ id: 'chat-1' }] }),
    user: options.noUser ? null : doc({ id: 'USR-real', identifier: oldDni, name: 'Juan', lastName: 'Perez', role: 'paciente', tenantId: 'TEN-1', password: 'original-hash', status: 'Activo' }),
    orders: [
      { id: 'open', tenantId: 'TEN-1', patientDni: oldDni, status: 'Pendiente' },
      { id: 'closed', tenantId: 'TEN-1', patientDni: '30.111.222', status: 'Emitida', recipePdfUrl: 'original.pdf' },
      { id: 'relative', tenantId: 'TEN-1', isForDependent: true, patientDni: '40123456', requestedByTitularDni: oldDni, status: 'Enviada', obraSocial: 'IOMA' },
      { id: 'unrelated', tenantId: 'TEN-1', patientDni: newDni, status: 'Pendiente' },
    ] as any[],
  };
  const service: any = new PatientService();
  const session = {};
  const writes: string[] = [];
  service.runTransaction = async (work: any) => work(session);
  service.repo = {
    findById: async (id: string) => state.patient?.id === id ? state.patient : null,
    findByUserId: async (id: string) => state.patient?.userId === id ? state.patient : null,
    findByDni: async (dni: string) => state.patient && clean(state.patient.dni) === clean(dni) ? state.patient : null,
    update: async (id: string, update: any, supplied: any) => {
      assert.equal(supplied, session);
      writes.push('patient');
      Object.assign(state.patient, update);
      return state.patient;
    },
    create: async (update: any, supplied: any) => {
      assert.equal(supplied, session);
      writes.push('create');
      state.patient = doc(update);
      return state.patient;
    },
  };
  service.userRepo = {
    findById: async (id: string) => state.user?.id === id ? state.user : null,
    findByDni: async (dni: string) => state.user && clean(state.user.identifier) === clean(dni) ? state.user : null,
    findByIdentifier: async (dni: string) => state.user?.identifier === dni ? state.user : null,
    update: async (id: string, update: any, supplied: any) => {
      assert.equal(supplied, session);
      writes.push('user');
      assert.equal(id, state.user.id);
      assert.equal('password' in update, false);
      Object.assign(state.user, update);
      return state.user;
    },
  };
  service.orderRepo = {
    findByPatientDnis: async (tenant: string, dnis: string[]) => {
      assert.deepEqual(dnis, [oldDni]);
      return state.orders.filter(o => o.tenantId === tenant && (dnis.includes(clean(o.patientDni || '')) || dnis.includes(clean(o.requestedByTitularDni || ''))));
    },
    update: async (id: string, update: any, supplied: any) => {
      assert.equal(supplied, session);
      writes.push(id);
      const order = state.orders.find(o => o.id === id);
      Object.assign(order, update);
      return order;
    },
  };
  return { service, state, session, writes };
}

async function withAudit(work: (entries: any[]) => Promise<void>) {
  const original = auditLogService.log;
  const entries: any[] = [];
  auditLogService.log = async (entry, session) => { entries.push({ ...entry, session }); };
  try { await work(entries); } finally { auditLogService.log = original; }
}

for (const reference of ['USR-real', 'PAT-real', oldDni, '30.111.222']) {
  test(`changes account DNI through original reference ${reference}`, async () => withAudit(async entries => {
    const { service, state, session } = fixture();
    const result = await service.updatePatient(reference, { dni: newDni }, staff);
    assert.equal(result.dni, newDni);
    assert.equal(result.previousDni, oldDni);
    assert.equal(result.id, 'PAT-real');
    assert.equal(result.userId, 'USR-real');
    assert.equal(state.user.id, 'USR-real');
    assert.equal(state.user.identifier, newDni);
    assert.equal(state.user.password, 'original-hash');
    assert.deepEqual(state.patient.messages, [{ id: 'chat-1' }]);
    assert.equal(state.orders[0].patientDni, newDni);
    assert.equal(state.orders[1].patientDni, newDni);
    assert.equal(state.orders[1].recipePdfUrl, 'original.pdf');
    assert.equal(state.orders[1].status, 'Emitida');
    assert.equal(state.orders[2].requestedByTitularDni, newDni);
    assert.equal(state.orders[2].patientDni, '40123456');
    assert.equal(state.orders[2].obraSocial, 'IOMA');
    assert.equal(state.orders[3].auditLog, undefined);
    assert.deepEqual(entries[0].changes.dni, { before: oldDni, after: newDni });
    assert.equal(entries[0].session, session);
    assert.equal(entries[0].currentUser.id, staff.id);
  }));
}

test('creates missing clinical record from the original account without replacing the account', async () => withAudit(async () => {
  const { service, state, writes } = fixture({ noPatient: true });
  state.user.city = 'Tandil';
  const result = await service.updatePatient('USR-real', { dni: newDni }, staff);
  assert.equal(result.userId, 'USR-real');
  assert.equal(result.city, 'Tandil');
  assert.ok(writes.includes('create'));
  assert.equal(state.user.password, 'original-hash');
}));

test('links an existing clinical record found by original DNI and permits a second save by patient ID', async () => withAudit(async () => {
  const { service, state } = fixture();
  state.patient.userId = undefined;
  const result = await service.updatePatient('USR-real', { dni: newDni }, staff);
  assert.equal(result.userId, 'USR-real');
  service.orderRepo.findByPatientDnis = async () => [];
  const second = await service.updatePatient(result.id, { phone: '1122334455' }, staff);
  assert.equal(second.dni, newDni);
  assert.equal(state.user.phone, '1122334455');
}));

for (const target of ['user', 'patient']) {
  test(`rejects conflicting ${target} before writes`, async () => {
    const { service, writes } = fixture();
    const repository = target === 'user' ? service.userRepo : service.repo;
    const original = repository.findByDni;
    repository.findByDni = async (dni: string, ...args: any[]) => dni === newDni
      ? { id: 'someone-else', dni: newDni, identifier: newDni } : original(dni, ...args);
    await assert.rejects(() => service.updatePatient('USR-real', { dni: newDni }, staff), /ya pertenece/);
    assert.deepEqual(writes, []);
  });
}

for (const reference of ['USR-real', 'PAT-real', oldDni]) {
  test(`rejects another tenant through ${reference} before writes`, async () => {
    const { service, state, writes } = fixture();
    state.patient.tenantId = 'TEN-other';
    state.user.tenantId = 'TEN-other';
    await assert.rejects(() => service.updatePatient(reference, { dni: newDni }, staff), /no encontrado/);
    assert.deepEqual(writes, []);
  });
}

test('rejects unauthorized roles, invalid DNI, and unknown references', async () => {
  const { service, writes } = fixture();
  await assert.rejects(() => service.updatePatient('USR-real', { dni: newDni }, { ...staff, role: 'paciente' }), /No autorizado/);
  await assert.rejects(() => service.updatePatient('USR-real', { dni: '123' }, staff), /al menos 6/);
  await assert.rejects(() => service.updatePatient('USR-unknown', { dni: newDni }, staff), /no encontrado/);
  assert.deepEqual(writes, []);
});

for (const target of ['userRepo', 'orderRepo', 'repo']) {
  test(`propagates ${target} synchronization failure to the transaction`, async () => withAudit(async () => {
    const { service } = fixture();
    service[target].update = async () => { throw new Error('write failed'); };
    await assert.rejects(() => service.updatePatient('USR-real', { dni: newDni }, staff), /write failed/);
  }));
  test(`rejects missing ${target} update results`, async () => withAudit(async () => {
    const { service } = fixture();
    service[target].update = async () => null;
    await assert.rejects(() => service.updatePatient('USR-real', { dni: newDni }, staff), /No se pudo|No se pudieron/);
  }));
}

test('uses a MongoDB transaction and propagates commit failure', async () => {
  const { service } = fixture();
  delete service.runTransaction;
  const original = mongoose.connection.transaction;
  let called = false;
  mongoose.connection.transaction = async () => { called = true; throw new Error('transaction failed'); };
  try {
    await assert.rejects(() => service.updatePatient('USR-real', { dni: newDni }, staff), /transaction failed/);
    assert.equal(called, true);
  } finally { mongoose.connection.transaction = original; }
});

test('authenticates with the new DNI and original password after correction', async () => withAudit(async () => {
  const { service, state } = fixture();
  state.user.password = await bcrypt.hash('test-only-password', 4);
  const hash = state.user.password;
  await service.updatePatient('USR-real', { dni: newDni }, staff);
  const auth: any = new AuthService();
  auth.userRepo = service.userRepo;
  const result = await auth.login(newDni, 'test-only-password');
  assert.equal(result.user.id, 'USR-real');
  assert.equal(result.user.identifier, newDni);
  assert.equal(state.user.password, hash);
  await assert.rejects(() => auth.login(oldDni, 'test-only-password'), /no registrado/);
}));


test('resolves an account without a clinical record through its original DNI', async () => withAudit(async () => {
  const { service, state } = fixture({ noPatient: true });
  await service.updatePatient(oldDni, { dni: newDni }, staff);
  assert.equal(state.patient.userId, state.user.id);
  assert.equal(state.patient.dni, newDni);
}));

test('updates a clinical record without creating a user account', async () => withAudit(async () => {
  const { service, state, writes } = fixture({ noUser: true });
  const result = await service.updatePatient('PAT-real', { dni: newDni }, staff);
  assert.equal(result.dni, newDni);
  assert.equal(state.user, null);
  assert.equal(writes.includes('user'), false);
}));

test('rejects inconsistent account links before writes', async () => {
  const { service, state, writes } = fixture();
  state.patient.userId = 'USR-someone-else';
  await assert.rejects(() => service.updatePatient('USR-real', { dni: newDni }, staff), /inconsistentes/);
  assert.deepEqual(writes, []);
});

test('does not swallow audit persistence errors inside a transaction', async () => {
  const audit: any = new AuditLogService();
  const session = {};
  audit.repo = { create: async (_entry: any, supplied: any) => {
    assert.equal(supplied, session);
    throw new Error('audit failed');
  } };
  await assert.rejects(() => audit.log({ action: 'PATIENT_UPDATE', entity: 'Patient' }, session), /audit failed/);
});

test('propagates audit failure rather than returning a successful correction', async () => {
  const original = auditLogService.log;
  auditLogService.log = async () => { throw new Error('audit failed'); };
  try {
    const { service } = fixture();
    await assert.rejects(() => service.updatePatient('USR-real', { dni: newDni }, staff), /audit failed/);
  } finally { auditLogService.log = original; }
});

test('returns a clear conflict if a concurrent account change hits the unique identifier index', async () => {
  const { service } = fixture();
  service.userRepo.update = async () => { throw Object.assign(new Error('duplicate key'), { code: 11000 }); };
  await assert.rejects(() => service.updatePatient('USR-real', { dni: newDni }, staff), /ya pertenece/);
});
