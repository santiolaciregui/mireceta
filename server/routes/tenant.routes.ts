import { Router } from 'express';
import { TenantController } from '../controllers/TenantController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new TenantController();

router.get('/resolve', controller.resolveTenant);
router.get('/', controller.getTenants);
router.post('/', authenticateToken, controller.createTenant);
router.get('/payment-config', authenticateToken, controller.getPaymentConfig);
router.put('/payment-config', authenticateToken, controller.updatePaymentConfig);

export default router;
