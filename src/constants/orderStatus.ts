/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ObraSocialOption } from '../types';

/**
 * Lista de obras sociales y prepagas disponibles en el sistema.
 * Movido desde src/types.ts para respetar el principio de responsabilidad única:
 * los tipos no deben exportar datos.
 */
export const OBRA_SOCIAL_OPTIONS: ObraSocialOption[] = [
  { id: 'pami', name: 'PAMI (Inssjp)', requiresNumber: true },
  { id: 'ioma', name: 'IOMA', requiresNumber: true },
  { id: 'osde', name: 'OSDE', requiresNumber: true },
  { id: 'osecac', name: 'OSECAC', requiresNumber: true },
  { id: 'swiss', name: 'Swiss Medical', requiresNumber: true },
  { id: 'galeno', name: 'GALENO', requiresNumber: true },
  { id: 'sancor', name: 'Sancor Salud', requiresNumber: true },
  { id: 'medicus', name: 'Medicus', requiresNumber: true },
  { id: 'ospedyc', name: 'OSPEDYC', requiresNumber: true },
  { id: 'osdepym', name: 'OSDEPYM', requiresNumber: true },
  { id: 'camioneros', name: 'Obra Social de Camioneros', requiresNumber: true },
  { id: 'union_personal', name: 'Unión Personal', requiresNumber: true },
  { id: 'osuthgra', name: 'OSUTHGRA (Gastronómicos)', requiresNumber: true },
  { id: 'ospacp', name: 'OSPACP (Personal de Casas Particulares)', requiresNumber: true },
  { id: 'ospg', name: 'OSPG (Petroleros)', requiresNumber: true },
  { id: 'particular', name: 'Particular / Sin Obra Social', requiresNumber: false },
  { id: 'otra', name: 'Otra Obra Social / Prepaga', requiresNumber: true },
];

/**
 * Labels de display para cada estado de orden.
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  Pendiente: 'Pendiente',
  'En revisión': 'En Revisión',
  'Solicita más información': 'Solicita Info',
  Aprobada: 'Aprobada',
  Rechazada: 'Rechazada',
  Emitida: 'Emitida',
  Enviada: 'Enviada',
};
