/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { PatientService } from '../services/PatientService.js';
import { getCurrentUser } from '../utils/httpHelpers.js';

const patientService = new PatientService();

export class PatientController {
  getPatients = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId || 'TEN-0001';
      const patients = await patientService.getPatientsByTenant(tenantId);
      res.json(patients);
    } catch (err: unknown) {
      next(err);
    }
  };

  getPatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenantId || 'TEN-0001';
      let patient = await patientService.getPatientById(id);
      if (!patient) {
        patient = await patientService.getPatientByDni(id, tenantId);
      }
      if (!patient) {
        return res.status(404).json({ error: 'Paciente no encontrado.' });
      }
      res.json(patient);
    } catch (err: unknown) {
      next(err);
    }
  };

  updatePatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updated = await patientService.updatePatient(id, req.body, getCurrentUser(req));
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error al actualizar los datos del paciente.' });
    }
  };
}
