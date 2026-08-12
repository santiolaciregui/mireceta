/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Constantes de navegación por sidebar.
 * Evita strings literales dispersos en App.tsx y otros componentes.
 */
export const PATIENT_ROUTES = {
  SOLICITAR: 'solicitar',
  PEDIDOS: 'pedidos',
  CHAT: 'chat',
  AYUDA: 'ayuda',
} as const;

export const DOCTOR_ROUTES = {
  PENDIENTES: 'pendientes',
  REVISION: 'revision',
  COMPLETADAS: 'completadas',
  RECHAZADAS: 'rechazadas',
  NUEVA: 'nueva',
} as const;

export const ADMIN_ROUTES = {
  USUARIOS: 'usuarios',
  AUDITORIA: 'auditoria',
  PAGOS: 'pagos',
  NOTIFICACIONES: 'notificaciones',
  REPORTES: 'reportes',
} as const;

export const CATEGORY_ROUTES = {
  TRAMITES: 'tramites',
  SOLICITUDES: 'solicitudes',
  MENSAJERIA: 'mensajeria',
  ADMIN_PANEL: 'admin_panel',
  SUPERADMIN_PANEL: 'superadmin_panel',
} as const;
