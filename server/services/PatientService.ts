import { PatientRepository } from '../repositories/PatientRepository.js';
import { auditLogService } from './AuditLogService.js';
import { cleanDni } from '../utils/formatters.js';
import { generatePatientId } from '../utils/idGenerator.js';

export class PatientService {
  private repo: PatientRepository;

  constructor() {
    this.repo = new PatientRepository();
  }

  async getPatientsByTenant(tenantId: string) {
    return this.repo.findByTenant(tenantId);
  }

  async getPatientByDni(dni: string, tenantId?: string) {
    return this.repo.findByDni(cleanDni(dni), tenantId);
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
}
