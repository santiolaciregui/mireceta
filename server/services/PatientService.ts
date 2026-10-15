import mongoose, { type ClientSession } from 'mongoose';
import type { IUser } from '../models/User.js';
import { randomUUID } from 'node:crypto';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PatientRepository } from '../repositories/PatientRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { auditLogService } from './AuditLogService.js';
import { coverageChange, coverageSnapshot } from './coverageAudit.js';
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
      const previousCoverage = { obraSocial: existing.obraSocial, obraSocialNumber: existing.obraSocialNumber };
      const updated = await this.repo.update(existing.id, {
        name: patientData.name || existing.name,
        lastName: patientData.lastName || existing.lastName,
        email: patientData.email || existing.email,
        phone: patientData.phone || existing.phone,
        birthDate: patientData.birthDate || existing.birthDate,
        obraSocial: patientData.obraSocial || existing.obraSocial,
        obraSocialNumber: patientData.obraSocialNumber || existing.obraSocialNumber
      });
      const changedCoverage = updated ? coverageChange(previousCoverage, updated) : null;

      await auditLogService.log({
        tenantId,
        currentUser,
        action: 'PATIENT_UPDATE',
        entity: 'Patient',
        entityId: existing.id,
        details: `Actualizados datos clínicos del paciente ${patientData.name} ${patientData.lastName}`,
        changes: changedCoverage ? { coverage: changedCoverage } : undefined,
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
      details: `Registrado nuevo paciente ${patientData.name} ${patientData.lastName} (DNI: ${dni})`,
      changes: { initialCoverage: coverageSnapshot(newPatient) },
    });

    return newPatient;
  }

  private runTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    return mongoose.connection.transaction(work);
  }

  async updatePatient(idOrDni: string, updateData: PatientInformationPayload, currentUser: any) {
    if (!currentUser || !isAuthorizedToEditPatient(currentUser.role)) {
      throw new Error('No autorizado para modificar datos de la ficha del paciente.');
    }

    const tenantId = currentUser.tenantId || 'TEN-0001';
    const assertTenant = (record: { tenantId?: string } | null) => {
      if (record && (record.tenantId || 'TEN-0001') !== tenantId) {
        throw new Error('Paciente no encontrado.');
      }
    };

    try {
      return await this.runTransaction(async (session) => {
        // Resolve identity using the original reference, never the requested new DNI.
        let patient = await this.repo.findById(idOrDni, session);
        assertTenant(patient);
        let user: IUser | null = null;
        if (!patient) {
          user = await this.userRepo.findById(idOrDni, session);
          assertTenant(user);
          if (user && user.role !== 'paciente') throw new Error('Paciente no encontrado.');
          if (user) {
            patient = await this.repo.findByUserId(user.id, tenantId, session)
              || await this.repo.findByDni(user.identifier, tenantId, session);
          } else if (/^[\d.\s-]+$/.test(idOrDni)) {
            patient = await this.repo.findByDni(idOrDni, tenantId, session);
            if (!patient) user = await this.userRepo.findByDni(idOrDni, session);
          }
        }
        if (patient) {
          user = user || (patient.userId ? await this.userRepo.findById(patient.userId, session) : null);
          if (!user) user = await this.userRepo.findByDni(patient.dni, session);
        }
        assertTenant(user);
        if (user && user.role !== 'paciente') throw new Error('Paciente no encontrado.');
        if (!patient && !user) throw new Error('Paciente no encontrado.');
        if (patient && user && ((patient.userId && patient.userId !== user.id)
          || cleanDni(patient.dni) !== cleanDni(user.identifier))) {
          throw new Error('La cuenta y la ficha tienen datos de identidad inconsistentes. Revisá su vinculación.');
        }

        const before = patient ? patient.toObject() : { ...user.toObject(), dni: user.identifier };
        const oldDni = cleanDni(before.dni);
        const normalized = validateAndNormalizePatientInformation(updateData, before);
        const conflictingUser = await this.userRepo.findByDni(normalized.dni, session);
        const conflictingPatient = await this.repo.findByDni(normalized.dni, tenantId, session);
        if ((conflictingUser && conflictingUser.id !== user?.id)
          || (conflictingPatient && conflictingPatient.id !== patient?.id)) {
          throw new Error('El DNI ingresado ya pertenece a otra cuenta o ficha de paciente.');
        }

        const { deliveryMethod, ...patientFields } = normalized;
        const patientId = patient?.id || `PAT-${randomUUID()}`;
        const updatedPatient = patient
          ? await this.repo.update(patientId, { ...patientFields, ...(user ? { userId: user.id } : {}) }, session)
          : await this.repo.create({ ...patientFields, id: patientId, userId: user.id, tenantId, status: 'Activo' }, session);
        if (!updatedPatient) throw new Error('No se pudo actualizar la ficha del paciente.');

        if (user) {
          const { dni, ...userFields } = patientFields;
          const updatedUser = await this.userRepo.update(user.id, { ...userFields, identifier: dni }, session);
          if (!updatedUser) throw new Error('No se pudo actualizar la cuenta del paciente.');
        }

        // Select only the original identity: never absorb orders belonging to the new DNI.
        const relatedOrders = await this.orderRepo.findByPatientDnis(tenantId, [oldDni], session);
        const operatorLabel = `${currentUser.name || ''} ${currentUser.lastName || ''} (${currentUser.role})`.trim();
        const changeSummary = getPatientChangeSummary(before, normalized);
        for (const order of relatedOrders) {
          if (order.tenantId !== tenantId) throw new Error('Paciente no encontrado.');
          const orderUpdates: Record<string, unknown> = {};
          if (cleanDni(order.patientDni) === oldDni) {
            Object.assign(orderUpdates, {
              patientName: normalized.name,
              patientLastName: normalized.lastName,
              patientDni: normalized.dni,
              patientBirthDate: normalized.birthDate,
              patientPhone: normalized.phone,
              patientEmail: normalized.email,
              patientCity: normalized.city,
              patientProvince: normalized.province,
              obraSocial: normalized.obraSocial,
              obraSocialNumber: normalized.obraSocialNumber,
              ...(deliveryMethod ? { deliveryMethod } : {}),
            });
          }
          if (cleanDni(order.requestedByTitularDni) === oldDni) {
            Object.assign(orderUpdates, {
              requestedByTitularDni: normalized.dni,
              requestedByTitularName: `${normalized.name} ${normalized.lastName}`,
              requestedByTitularEmail: normalized.email,
              requestedByTitularPhone: normalized.phone,
            });
          }
          if (!Object.keys(orderUpdates).length) continue;
          addAuditLogEntry(order, 'Ficha del paciente actualizada', operatorLabel,
            `Corrección administrativa de ficha: ${changeSummary}`);
          const updatedOrder = await this.orderRepo.update(order.id, { ...orderUpdates, auditLog: order.auditLog }, session);
          if (!updatedOrder) throw new Error('No se pudieron sincronizar las solicitudes del paciente.');
        }

        const changedCoverage = coverageChange(before, updatedPatient);
        await auditLogService.log({
          tenantId,
          currentUser,
          action: 'PATIENT_UPDATE',
          entity: 'Patient',
          entityId: patientId,
          changes: {
            ...(changedCoverage ? { coverage: changedCoverage } : {}),
            ...(oldDni !== normalized.dni ? { dni: { before: oldDni, after: normalized.dni } } : {}),
          },
          details: `Ficha del paciente ${normalized.name} ${normalized.lastName} actualizada por ${operatorLabel}: ${changeSummary}`,
        }, session);

        return { ...updatedPatient.toObject(), previousDni: oldDni };
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new Error('El DNI ingresado ya pertenece a otra cuenta o ficha de paciente.');
      }
      throw err;
    }
  }
}
