import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController.js';

const router = Router();
const controller = new PaymentController();

router.post('/create-preference', controller.createPreference.bind(controller));
router.post('/webhook', controller.webhook.bind(controller));
router.get('/webhook', controller.webhook.bind(controller));
router.get('/status/:orderId', controller.getStatus.bind(controller));

export default router;
