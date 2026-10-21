// US-014, 2026-10-21: exact checkout ownership; no similarity recovery.
import { cleanDni } from '../utils/formatters.js';

export function assertCheckoutAccess(order: any, user: any) {
  if (!user?.id || (order.tenantId || 'TEN-0001') !== (user.tenantId || 'TEN-0001')) {
    throw new Error('Acceso no autorizado a esta solicitud.');
  }
  if (user.role === 'admin') throw new Error('Los administradores no pueden iniciar pagos.');
  if (user.role === 'paciente') {
    const dni = cleanDni(user.identifier || '');
    const dependents = (user.dependents || []).map((d: any) => cleanDni(d.dni || d.identifier || '')).filter(Boolean);
    if (!dni || !(cleanDni(order.patientDni || '') === dni
      || cleanDni(order.requestedByTitularDni || '') === dni
      || dependents.includes(cleanDni(order.patientDni || '')))) {
      throw new Error('Acceso no autorizado a esta solicitud.');
    }
  } else if (!['medico', 'colaborador'].includes(user.role)) {
    throw new Error('Acceso no autorizado a esta solicitud.');
  }
}

export function assertCheckoutPayable(order: any) {
  if (order.status !== 'Pendiente' || order.paymentMethod !== 'mp'
    || !['pending', 'rejected'].includes(order.paymentStatus)) {
    throw new Error(`La solicitud ${order.id} no admite continuar el pago. Revisá su estado actual.`);
  }
}
