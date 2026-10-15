import assert from 'node:assert/strict';
import test from 'node:test';
import { canCancelOrder, cancellableOrderStatuses } from './orderCancellation';

const active = ['Pendiente', 'En revisión', 'Solicita más información', 'Aprobada'];
const terminal = ['Emitida', 'Enviada', 'Rechazada', 'Cancelada'];

for (const role of ['medico', 'colaborador', 'superadmin', 'paciente', 'admin', 'unknown', undefined]) {
  test(`cancellation action follows clinical role permissions for ${role ?? 'missing role'}`, () => {
    const eligible = role === 'paciente' ? active.slice(0, 2)
      : ['medico', 'colaborador', 'superadmin'].includes(role ?? '') ? active : [];
    assert.deepEqual(cancellableOrderStatuses(role), eligible);
    for (const status of [...active, ...terminal]) {
      assert.equal(canCancelOrder({ status }, role), eligible.includes(status), `${role}: ${status}`);
    }
  });
}
