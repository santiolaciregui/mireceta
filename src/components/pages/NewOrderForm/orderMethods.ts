/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MedicationItem, MedicationPhoto } from '../../../types';

export interface RepeatableOrderData {
  medicationItems: MedicationItem[];
  medicationPhotos: MedicationPhoto[];
  diagnostic: string;
  comments: string;
  lastConsultationTime?: string;
  lastConsultationDoctor?: string;
}

/**
 * Filter and sort historical orders belonging to a patient by DNI.
 */
export function filterPatientOrders(orders: any[], patientDni: string): any[] {
  const cleanDni = (patientDni || '').trim();
  if (!orders || !Array.isArray(orders) || !cleanDni) return [];

  return orders
    .filter((o: any) => o && o.patientDni && o.patientDni.toString().trim() === cleanDni)
    .sort((a: any, b: any) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
}

/**
 * Extract clonable data from an existing historical order to repeat in a new order.
 */
export function getRepeatableOrderData(order: any): RepeatableOrderData {
  if (!order) {
    return {
      medicationItems: [],
      medicationPhotos: [],
      diagnostic: '',
      comments: '',
    };
  }

  const medicationItems: MedicationItem[] = Array.isArray(order.medicationItems)
    ? order.medicationItems.map((item: any) => ({
        nombreComercial: item.nombreComercial || '',
        miligramos: item.miligramos || '',
        presentacion: item.presentacion || 'Comprimidos',
        cantidadCajas: typeof item.cantidadCajas === 'number' ? item.cantidadCajas : 1,
        droga: item.droga,
        unidadesPorCaja: item.unidadesPorCaja,
        diagnostic: item.diagnostic,
        comments: item.comments,
      }))
    : [];

  const medicationPhotos: MedicationPhoto[] = Array.isArray(order.medicationPhotos)
    ? order.medicationPhotos.map((photo: any) => ({
        url: photo.url || '',
        name: photo.name || 'Receta anterior',
        cantidadCajas: typeof photo.cantidadCajas === 'number' ? photo.cantidadCajas : 1,
        unidadesPorCaja: photo.unidadesPorCaja !== undefined ? photo.unidadesPorCaja : 30,
        diagnostic: photo.diagnostic || '',
        comments: photo.comments || '',
      }))
    : [];

  return {
    medicationItems,
    medicationPhotos,
    diagnostic: order.diagnostic || '',
    comments: order.comments || '',
    lastConsultationTime: order.lastConsultationTime || undefined,
    lastConsultationDoctor: order.lastConsultationDoctor || undefined,
  };
}

/**
 * Format a concise summary text describing a past order for labels and selectors.
 */
export function getPastOrderDisplaySummary(order: any): string {
  if (!order) return '';
  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Sin fecha';

  const medCount = Array.isArray(order.medicationItems) ? order.medicationItems.length : 0;
  const photoCount = Array.isArray(order.medicationPhotos) ? order.medicationPhotos.length : 0;
  const diag = order.diagnostic ? ` - ${order.diagnostic}` : '';

  let detail = '';
  if (medCount > 0) {
    detail = `${medCount} ${medCount === 1 ? 'medicamento' : 'medicamentos'}`;
  } else if (photoCount > 0) {
    detail = `${photoCount} ${photoCount === 1 ? 'receta/foto' : 'recetas/fotos'}`;
  } else {
    detail = 'Sin ítems';
  }

  return `${dateStr}${diag} (${detail})`;
}
