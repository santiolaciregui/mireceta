import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController.js';

const router = Router();
const controller = new PaymentController();

router.post('/create-preference', controller.createPreference);
router.post('/webhook', controller.webhook);
router.get('/webhook', controller.webhook);
router.get('/status/:orderId', controller.getStatus);

export default router;
