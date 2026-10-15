import type { MedicalOrder, PatientInformationUpdate } from '../types';

export interface SavedPatientRecord extends PatientInformationUpdate {
  id: string;
  userId?: string;
  previousDni: string;
}

const cleanDni = (value?: string) => (value || '').replace(/\D/g, '');

// Apply the same identity rules as the server without replacing cached attachments.
export function applyPatientRecordToOrder(order: MedicalOrder, patient: SavedPatientRecord): MedicalOrder {
  const oldDni = cleanDni(patient.previousDni);
  if (!oldDni) return order;
  let updated = order;
  if (cleanDni(order.patientDni) === oldDni) {
    updated = {
      ...updated,
      patientName: patient.name,
      patientLastName: patient.lastName,
      patientDni: patient.dni,
      patientPhone: patient.phone,
      patientEmail: patient.email,
      patientBirthDate: patient.birthDate,
      patientCity: patient.city,
      patientProvince: patient.province,
      obraSocial: patient.obraSocial,
      obraSocialNumber: patient.obraSocialNumber,
    };
  }
  if (cleanDni(order.requestedByTitularDni) === oldDni) {
    updated = {
      ...updated,
      requestedByTitularDni: patient.dni,
      requestedByTitularName: `${patient.name} ${patient.lastName}`,
      requestedByTitularPhone: patient.phone,
      requestedByTitularEmail: patient.email,
    };
  }
  return updated;
}
