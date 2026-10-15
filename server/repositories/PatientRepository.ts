import type { ClientSession } from 'mongoose';
import { Patient, IPatient } from '../models/Patient.js';
import { cleanDni, cleanPhone } from '../utils/formatters.js';

export class PatientRepository {
  async findById(id: string, session?: ClientSession): Promise<IPatient | null> {
    return Patient.findOne({ id }).session(session || null);
  }

  async findByDni(dni: string, tenantId?: string, session?: ClientSession): Promise<IPatient | null> {
    const clean = cleanDni(dni);
    if (!clean) return null;
    const pattern = `^[.\\s-]*${clean.split('').join('[.\\s-]*')}[.\\s-]*$`;
    const query: Record<string, unknown> = { dni: { $regex: new RegExp(pattern) } };
    if (tenantId) query.tenantId = tenantId;
    return Patient.findOne(query).session(session || null);
  }

  async findByUserId(userId: string, tenantId: string, session?: ClientSession): Promise<IPatient | null> {
    return Patient.findOne({ userId, tenantId }).session(session || null);
  }

  async findSummaryByDni(dni: string, tenantId?: string): Promise<IPatient | null> {
    const clean = cleanDni(dni);
    const query: Record<string, unknown> = {
      $or: [{ dni }, { dni: clean }]
    };
    if (tenantId) query.tenantId = tenantId;
    return Patient.findOne(query, { 'messages.fileUrl': 0 }).lean() as unknown as IPatient | null;
  }

  async findByPhone(phone: string, tenantId?: string): Promise<IPatient[]> {
    let clean = cleanPhone(phone);
    if (clean.startsWith('549')) clean = clean.slice(3);
    else if (clean.startsWith('54')) clean = clean.slice(2);
    if (clean.startsWith('0')) clean = clean.slice(1);
    const last8Digits = clean.slice(-8);

    const query: Record<string, unknown> = {};
    if (tenantId) query.tenantId = tenantId;

    const patients = await Patient.find(query);
    return patients.filter((p: IPatient) => {
      let patientPhoneClean = cleanPhone(p.phone);
      if (patientPhoneClean.startsWith('549')) patientPhoneClean = patientPhoneClean.slice(3);
      else if (patientPhoneClean.startsWith('54')) patientPhoneClean = patientPhoneClean.slice(2);
      if (patientPhoneClean.startsWith('0')) patientPhoneClean = patientPhoneClean.slice(1);

      if (patientPhoneClean.length < 6 || last8Digits.length < 6) return false;
      return patientPhoneClean.slice(-8) === last8Digits;
    });
  }

  async findSummariesByTenant(tenantId: string): Promise<IPatient[]> {
    return Patient.find({ tenantId }, { 'messages.fileUrl': 0 })
      .sort({ lastName: 1, name: 1 })
      .lean() as unknown as IPatient[];
  }

  async findByTenant(tenantId: string): Promise<IPatient[]> {
    return Patient.find({ tenantId }).sort({ lastName: 1, name: 1 }).lean() as unknown as IPatient[];
  }

  async create(patientData: Partial<IPatient>, session?: ClientSession): Promise<IPatient> {
    const patient = new Patient(patientData);
    return patient.save({ session });
  }

  async update(id: string, updateData: Partial<IPatient>, session?: ClientSession): Promise<IPatient | null> {
    const patient = await this.findById(id, session);
    if (!patient) return null;
    Object.assign(patient, updateData);
    return patient.save({ session });
  }

  async delete(id: string): Promise<boolean> {
    const result = await Patient.deleteOne({ id });
    return result.deletedCount > 0;
  }
}
