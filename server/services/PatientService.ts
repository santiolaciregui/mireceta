/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PatientRepository } from '../repositories/PatientRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { auditLogService } from './AuditLogService.js';
import { cleanDni } from '../utils/formatters.js';
import { generatePatientId } from '../utils/idGenerator.js';
import { addAuditLogEntry } from '../utils/orderUtils.js';
import {
  validateAndNormalizePatientInformation,
  getPatientChangeSummary,
  isAuthorizedToEditPatient,
  PatientInformationPayload,
} from './patientInformationUpdate.js';

export class PatientService {
  private repo: PatientRepository;
  private userRepo: UserRepository;
  private orderRepo: OrderRepository;

  constructor() {
    this.repo = new PatientRepository();
    this.userRepo = new UserRepository();
    this.orderRepo = new OrderRepository();
  }

  async getPatientsByTenant(tenantId: string) {
    return this.repo.findByTenant(tenantId);
  }

  async getPatientByDni(dni: string, tenantId?: string) {
    return this.repo.findByDni(cleanDni(dni), tenantId);
  }

  async getPatientById(id: string) {
    return this.repo.findById(id);
  }

  async createOrUpdatePatient(patientData: any, currentUser?: any) {
    const tenantId = patientData.tenantId || currentUser?.tenantId || 'TEN-0001';
    const dni = cleanDni(patientData.dni || patientData.identifier);
    let existing = await this.repo.findByDni(dni, tenantId);

    if (existing) {
      const updated = await this.repo.update(existing.id, {
        name: patientData.name || existing.name,
        lastName: patientData.lastName || existing.lastName,
        email: patientData.email || existing.email,
        phone: patientData.phone || existing.phone,
        birthDate: patientData.birthDate || existing.birthDate,
        obraSocial: patientData.obraSocial || existing.obraSocial,
        obraSocialNumber: patientData.obraSocialNumber || existing.obraSocialNumber
      });

      await auditLogService.log({
        tenantId,
        currentUser,
        action: 'PATIENT_UPDATE',
        entity: 'Patient',
        entityId: existing.id,
        details: `Actualizados datos clínicos del paciente ${patientData.name} ${patientData.lastName}`
      });

      return updated;
    }

    const count = (await this.repo.findByTenant(tenantId)).length;
    const newId = generatePatientId(count);

    const newPatient = await this.repo.create({
      id: newId,
      dni,
      name: patientData.name,
      lastName: patientData.lastName,
      email: patientData.email,
      phone: patientData.phone,
      birthDate: patientData.birthDate,
      obraSocial: patientData.obraSocial,
      obraSocialNumber: patientData.obraSocialNumber,
      tenantId,
      userId: patientData.userId,
      status: 'Activo'
    });

    await auditLogService.log({
      tenantId,
      currentUser,
      action: 'PATIENT_CREATE',
      entity: 'Patient',
      entityId: newId,
      details: `Registrado nuevo paciente ${patientData.name} ${patientData.lastName} (DNI: ${dni})`
    });

    return newPatient;
  }

  async updatePatient(idOrDni: string, updateData: PatientInformationPayload, currentUser: any) {
    if (!currentUser || !isAuthorizedToEditPatient(currentUser.role)) {
      throw new Error('No autorizado para modificar datos de la ficha del paciente.');
    }

    const tenantId = currentUser.tenantId || 'TEN-0001';
    let patient = await this.repo.findById(idOrDni);
    if (!patient) {
      patient = await this.repo.findByDni(cleanDni(idOrDni), tenantId);
    }

    // If patient document not yet created in Patient collection, check User collection
    if (!patient) {
      const cleanTargetDni = cleanDni(idOrDni);
      const user = await this.userRepo.findByIdentifier(cleanTargetDni);
      if (user && user.role === 'paciente') {
        patient = await this.createOrUpdatePatient({
          dni: user.identifier,
          name: user.name,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          birthDate: user.birthDate,
          obraSocial: user.obraSocial,
          obraSocialNumber: user.obraSocialNumber,
          tenantId: user.tenantId,
          userId: user.id
        }, currentUser);
      }
    }

    if (!patient) {
      throw new Error('Paciente no encontrado.');
    }

    const oldDni = patient.dni;
    const normalized = validateAndNormalizePatientInformation(updateData, patient.toObject ? patient.toObject() : patient);
    const changeSummary = getPatientChangeSummary(patient.toObject ? patient.toObject() : patient, normalized);

    // 1. Update Patient record
    const updatedPatient = await this.repo.update(patient.id, {
      name: normalized.name,
      lastName: normalized.lastName,
      dni: normalized.dni,
      birthDate: normalized.birthDate,
      phone: normalized.phone,
      email: normalized.email,
      city: normalized.city,
      province: normalized.province,
      obraSocial: normalized.obraSocial,
      obraSocialNumber: normalized.obraSocialNumber,
    });

    // 2. Synchronize linked User account if it exists
    try {
      let userToSync = patient.userId ? await this.userRepo.findById(patient.userId) : null;
      if (!userToSync) {
        userToSync = await this.userRepo.findByIdentifier(cleanDni(oldDni));
      }
      if (userToSync && userToSync.role === 'paciente') {
        await this.userRepo.update(userToSync.id, {
          name: normalized.name,
          lastName: normalized.lastName,
          identifier: normalized.dni,
          birthDate: normalized.birthDate,
          phone: normalized.phone,
          email: normalized.email,
          city: normalized.city,
          province: normalized.province,
          obraSocial: normalized.obraSocial,
          obraSocialNumber: normalized.obraSocialNumber,
        });
      }
    } catch (userSyncErr) {
      console.error('[PatientService] Error sincronizando usuario vinculado:', userSyncErr);
    }

    // 3. Synchronize orders for this patient
    try {
      const patientDnisToSearch = Array.from(new Set([cleanDni(oldDni), normalized.dni].filter(Boolean)));
      const relatedOrders = await this.orderRepo.findByPatientDnis(tenantId, patientDnisToSearch);
      const operatorName = `${currentUser.name || ''} ${currentUser.lastName || ''} (${currentUser.role})`.trim();

      for (const order of relatedOrders) {
        const isTitularOrder = !order.isForDependent || cleanDni(order.patientDni) === cleanDni(oldDni);
        if (isTitularOrder) {
          const orderUpdates: Record<string, unknown> = {
            patientName: normalized.name,
            patientLastName: normalized.lastName,
            patientDni: normalized.dni,
            patientBirthDate: normalized.birthDate || order.patientBirthDate,
            patientPhone: normalized.phone || order.patientPhone,
            patientEmail: normalized.email || order.patientEmail,
            patientCity: normalized.city || order.patientCity,
            patientProvince: normalized.province || order.patientProvince,
            obraSocial: normalized.obraSocial,
            obraSocialNumber: normalized.obraSocialNumber || order.obraSocialNumber,
          };
          if (normalized.deliveryMethod) {
            orderUpdates.deliveryMethod = normalized.deliveryMethod;
          }

          addAuditLogEntry(
            order,
            'Ficha del paciente actualizada',
            operatorName,
            `Corrección administrativa de ficha: ${changeSummary}`
          );

          await this.orderRepo.update(order.id, {
            ...orderUpdates,
            auditLog: order.auditLog,
          });
        }
      }
    } catch (orderSyncErr) {
      console.error('[PatientService] Error sincronizando solicitudes asociadas:', orderSyncErr);
    }

    // 4. Global Audit Log
    const operatorLabel = `${currentUser.name || ''} ${currentUser.lastName || ''} (${currentUser.role})`.trim();
    await auditLogService.log({
      tenantId,
      currentUser,
      action: 'PATIENT_UPDATE',
      entity: 'Patient',
      entityId: patient.id,
      details: `Ficha del paciente ${normalized.name} ${normalized.lastName} (DNI: ${normalized.dni}) actualizada por ${operatorLabel}: ${changeSummary}`
    });

    return updatedPatient || patient;
  }
}
