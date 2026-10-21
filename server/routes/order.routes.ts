import { Router } from 'express';
import { OrderController } from '../controllers/OrderController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new OrderController();

// Public PDF inline view endpoint (Unauthenticated for direct WhatsApp link access)
router.get('/public/:id/pdf/:index', controller.streamPublicPdf);
router.get('/public/:id/pdf', controller.streamPublicPdf);

router.use(authenticateToken);

router.post('/flow-events', controller.recordFlowEvent);
router.get('/', controller.getOrders);
router.get('/checkout-attempt/:clientRequestId', controller.getCheckoutAttempt);
router.get('/:id', controller.getOrder);
router.post('/', controller.createOrder);
router.put('/:id', controller.updateOrder);
router.delete('/:id', controller.deleteOrder);
router.post('/:id/chat', controller.addChatMessage);
router.post('/:id/send-link', controller.sendRecipeLink);

export default router;
