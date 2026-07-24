import { Patient, IPatient } from '../models/Patient.js';

export class PatientRepository {
  async findById(id: string) {
    return (Patient as any).findOne({ id });
  }

  async findByDni(dni: string, tenantId?: string) {
    const query: any = { dni };
    if (tenantId) query.tenantId = tenantId;
    return (Patient as any).findOne(query);
  }

  async findByTenant(tenantId: string) {
    return (Patient as any).find({ tenantId }).sort({ lastName: 1, name: 1 });
  }

  async create(patientData: Partial<IPatient>) {
    const patient = new Patient(patientData);
    return patient.save();
  }

  async update(id: string, updateData: Partial<IPatient>) {
    const patient = await this.findById(id);
    if (!patient) return null;
    Object.assign(patient, updateData);
    return patient.save();
  }

  async delete(id: string) {
    return (Patient as any).deleteOne({ id });
  }
}
