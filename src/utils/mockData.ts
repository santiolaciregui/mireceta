/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MedicalOrder, SystemUser } from '../types';

// System initial data lists
export const INITIAL_USERS: SystemUser[] = [];

// Medical initial data lists
export const INITIAL_ORDERS: MedicalOrder[] = [];

export const BANK_DETAILS = {
  bank: 'Banco de la Provincia de Buenos Aires',
  accountType: 'Caja de Ahorros Especial',
  cbu: '0140304301304905910293',
  alias: 'recetas.coronelsuarez',
  titular: 'Servicio Médico Oficial',
  costPerPrescription: '1.200 por receta (sin cargo para jubilados PAMI con subsidio social, sugerido de colaboración)',
};
