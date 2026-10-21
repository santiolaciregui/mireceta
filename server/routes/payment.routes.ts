import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { PaymentController } from '../controllers/PaymentController.js';

const router = Router();
const controller = new PaymentController();

router.post('/create-preference', authenticateToken, controller.createPreference);
router.post('/webhook', controller.webhook);
router.get('/webhook', controller.webhook);
router.get('/status/:orderId', controller.getStatus);
router.post('/sync-return', controller.syncReturn);
router.get('/sync-return', controller.syncReturn);
router.get('/reconcile-pending', controller.reconcilePending);

export default router;
