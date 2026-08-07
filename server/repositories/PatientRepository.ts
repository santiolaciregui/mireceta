import { Patient, IPatient } from '../models/Patient.js';
import { cleanDni } from '../utils/formatters.js';

export class PatientRepository {
  async findById(id: string): Promise<IPatient | null> {
    return Patient.findOne({ id });
  }

  async findByDni(dni: string, tenantId?: string): Promise<IPatient | null> {
    const clean = cleanDni(dni);
    const query: Record<string, unknown> = {
      $or: [
        { dni },
        { dni: clean }
      ]
    };
    if (tenantId) query.tenantId = tenantId;
    return Patient.findOne(query);
  }

  async findByTenant(tenantId: string): Promise<IPatient[]> {
    return Patient.find({ tenantId }).sort({ lastName: 1, name: 1 });
  }

  async create(patientData: Partial<IPatient>): Promise<IPatient> {
    const patient = new Patient(patientData);
    return patient.save();
  }

  async update(id: string, updateData: Partial<IPatient>): Promise<IPatient | null> {
    const patient = await this.findById(id);
    if (!patient) return null;
    Object.assign(patient, updateData);
    return patient.save();
  }

  async delete(id: string): Promise<boolean> {
    const result = await Patient.deleteOne({ id });
    return result.deletedCount > 0;
  }
}
