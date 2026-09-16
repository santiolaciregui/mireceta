/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { PatientController } from '../controllers/PatientController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new PatientController();

router.use(authenticateToken);

router.get('/', controller.getPatients);
router.get('/:id', controller.getPatient);
router.put('/:id', controller.updatePatient);

export default router;
