import { Router } from 'express';
import { OrderController } from '../controllers/OrderController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new OrderController();

// Public PDF inline view endpoint (Unauthenticated for direct WhatsApp link access)
router.get('/public/:id/pdf', controller.streamPublicPdf);

router.use(authenticateToken);

router.get('/', controller.getOrders);
router.post('/', controller.createOrder);
router.put('/:id', controller.updateOrder);
router.delete('/:id', controller.deleteOrder);
router.post('/:id/chat', controller.addChatMessage);

export default router;
