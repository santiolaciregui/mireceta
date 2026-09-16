/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cleanDni, cleanPhone } from '../utils/formatters.js';

export interface PatientInformationPayload {
  name?: string;
  lastName?: string;
  dni?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  city?: string;
  province?: string;
  obraSocial?: string;
  obraSocialNumber?: string;
  deliveryMethod?: 'email' | 'whatsapp' | 'both';
  // If editing an order with patient fields
  patientName?: string;
  patientLastName?: string;
  patientDni?: string;
  patientBirthDate?: string;
  patientPhone?: string;
  patientEmail?: string;
  patientCity?: string;
  patientProvince?: string;
}

export interface NormalizedPatientInformation {
  name: string;
  lastName: string;
  dni: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  city?: string;
  province?: string;
  obraSocial: string;
  obraSocialNumber?: string;
  deliveryMethod?: 'email' | 'whatsapp' | 'both';
}

const PATIENT_INFO_KEYS = new Set([
  'name',
  'lastName',
  'dni',
  'birthDate',
  'phone',
  'email',
  'city',
  'province',
  'obraSocial',
  'obraSocialNumber',
  'deliveryMethod',
  'patientName',
  'patientLastName',
  'patientDni',
  'patientBirthDate',
  'patientPhone',
  'patientEmail',
  'patientCity',
  'patientProvince',
]);

export function hasPatientInformationUpdate(data: Record<string, unknown>): boolean {
  if (!data || typeof data !== 'object') return false;
  return Object.keys(data).some((key) => PATIENT_INFO_KEYS.has(key));
}

export function isAuthorizedToEditPatient(role?: string): boolean {
  return role === 'colaborador' || role === 'medico' || role === 'admin' || role === 'superadmin';
}

export function validateAndNormalizePatientInformation(
  input: PatientInformationPayload,
  current?: Record<string, unknown>
): NormalizedPatientInformation {
  const rawName = input.name ?? input.patientName ?? current?.name ?? current?.patientName;
  const rawLastName = input.lastName ?? input.patientLastName ?? current?.lastName ?? current?.patientLastName;
  const rawDni = input.dni ?? input.patientDni ?? current?.dni ?? current?.patientDni ?? current?.identifier;

  const name = typeof rawName === 'string' ? rawName.trim() : '';
  const lastName = typeof rawLastName === 'string' ? rawLastName.trim() : '';
  const dni = cleanDni(typeof rawDni === 'string' ? rawDni : String(rawDni || ''));

  if (!name) {
    throw new Error('El nombre del paciente es obligatorio.');
  }
  if (!lastName) {
    throw new Error('El apellido del paciente es obligatorio.');
  }
  if (!dni || dni.length < 6) {
    throw new Error('El DNI debe contener al menos 6 dígitos válidos.');
  }

  const rawPhone = input.phone ?? input.patientPhone ?? current?.phone ?? current?.patientPhone;
  const phone = typeof rawPhone === 'string' ? cleanPhone(rawPhone) : undefined;

  const rawEmail = input.email ?? input.patientEmail ?? current?.email ?? current?.patientEmail;
  let email: string | undefined;
  if (typeof rawEmail === 'string' && rawEmail.trim()) {
    const trimmed = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new Error('El formato del correo electrónico no es válido.');
    }
    email = trimmed;
  }

  const rawBirthDate = input.birthDate ?? input.patientBirthDate ?? current?.birthDate ?? current?.patientBirthDate;
  let birthDate: string | undefined;
  if (typeof rawBirthDate === 'string' && rawBirthDate.trim()) {
    const trimmed = rawBirthDate.trim();
    if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) {
        throw new Error('La fecha de nacimiento no es válida.');
      }
      birthDate = trimmed;
    } else {
      birthDate = trimmed;
    }
  }

  const rawCity = input.city ?? input.patientCity ?? current?.city ?? current?.patientCity;
  const city = typeof rawCity === 'string' ? rawCity.trim() : undefined;

  const rawProvince = input.province ?? input.patientProvince ?? current?.province ?? current?.patientProvince;
  const province = typeof rawProvince === 'string' ? rawProvince.trim() : undefined;

  const rawObraSocial = input.obraSocial ?? current?.obraSocial;
  const obraSocial = typeof rawObraSocial === 'string' && rawObraSocial.trim()
    ? rawObraSocial.trim()
    : 'Particular';

  const rawObraSocialNumber = input.obraSocialNumber ?? current?.obraSocialNumber;
  const obraSocialNumber = typeof rawObraSocialNumber === 'string' ? rawObraSocialNumber.trim() : undefined;

  const rawDelivery = input.deliveryMethod ?? current?.deliveryMethod;
  const deliveryMethod = rawDelivery === 'email' || rawDelivery === 'whatsapp' || rawDelivery === 'both'
    ? rawDelivery
    : undefined;

  return {
    name,
    lastName,
    dni,
    birthDate: birthDate || undefined,
    phone: phone || undefined,
    email: email || undefined,
    city: city || undefined,
    province: province || undefined,
    obraSocial,
    obraSocialNumber: obraSocialNumber || undefined,
    deliveryMethod,
  };
}

export function getPatientChangeSummary(
  before: Record<string, unknown>,
  after: NormalizedPatientInformation
): string {
  const changes: string[] = [];

  const beforeName = String(before.name ?? before.patientName ?? '').trim();
  if (beforeName && beforeName !== after.name) {
    changes.push(`Nombre: "${beforeName}" → "${after.name}"`);
  }

  const beforeLastName = String(before.lastName ?? before.patientLastName ?? '').trim();
  if (beforeLastName && beforeLastName !== after.lastName) {
    changes.push(`Apellido: "${beforeLastName}" → "${after.lastName}"`);
  }

  const beforeDni = cleanDni(String(before.dni ?? before.patientDni ?? before.identifier ?? ''));
  if (beforeDni && beforeDni !== after.dni) {
    changes.push(`DNI: "${beforeDni}" → "${after.dni}"`);
  }

  const beforePhone = cleanPhone(String(before.phone ?? before.patientPhone ?? ''));
  const afterPhone = cleanPhone(after.phone || '');
  if (beforePhone !== afterPhone) {
    changes.push(`Teléfono: "${beforePhone || 'vacío'}" → "${afterPhone || 'vacío'}"`);
  }

  const beforeEmail = String(before.email ?? before.patientEmail ?? '').trim().toLowerCase();
  const afterEmail = (after.email || '').trim().toLowerCase();
  if (beforeEmail !== afterEmail) {
    changes.push(`Email: "${beforeEmail || 'vacío'}" → "${afterEmail || 'vacío'}"`);
  }

  const beforeOs = String(before.obraSocial ?? '').trim();
  if (beforeOs && beforeOs !== after.obraSocial) {
    changes.push(`Obra Social: "${beforeOs}" → "${after.obraSocial}"`);
  }

  const beforeOsNum = String(before.obraSocialNumber ?? '').trim();
  const afterOsNum = (after.obraSocialNumber || '').trim();
  if (beforeOsNum !== afterOsNum) {
    changes.push(`Nº Afiliado: "${beforeOsNum || 'vacío'}" → "${afterOsNum || 'vacío'}"`);
  }

  const beforeBirth = String(before.birthDate ?? before.patientBirthDate ?? '').trim();
  const afterBirth = (after.birthDate || '').trim();
  if (beforeBirth !== afterBirth) {
    changes.push(`Fecha de Nacimiento: "${beforeBirth || 'vacío'}" → "${afterBirth || 'vacío'}"`);
  }

  return changes.length > 0 ? changes.join(', ') : 'Actualización de datos generales del paciente';
}
