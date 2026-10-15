/** US-011 / T-001 (2026-10-15): cancellation preserves clinical history. */
type CancellableStatus = 'Pendiente' | 'En revisión' | 'Solicita más información' | 'Aprobada';

export function cancellableOrderStatuses(role?: string): CancellableStatus[] {
  if (role === 'paciente') return ['Pendiente', 'En revisión'];
  if (role === 'medico' || role === 'colaborador' || role === 'superadmin') {
    return ['Pendiente', 'En revisión', 'Solicita más información', 'Aprobada'];
  }
  return [];
}

export function canCancelOrder(order: { status: string }, role?: string): boolean {
  return cancellableOrderStatuses(role).some(status => status === order.status);
}
