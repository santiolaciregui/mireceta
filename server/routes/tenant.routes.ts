import { Router } from 'express';
import { TenantController } from '../controllers/TenantController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new TenantController();

router.get('/resolve', controller.resolveTenant.bind(controller));
router.get('/', controller.getTenants.bind(controller));
router.post('/', authenticateToken, controller.createTenant.bind(controller));
router.get('/payment-config', authenticateToken, controller.getPaymentConfig.bind(controller));
router.put('/payment-config', authenticateToken, controller.updatePaymentConfig.bind(controller));

export default router;
