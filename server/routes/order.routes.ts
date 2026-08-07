import { Router } from 'express';
import { OrderController } from '../controllers/OrderController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new OrderController();

// Public PDF inline view endpoint (Unauthenticated for direct WhatsApp link access)
router.get('/public/:id/pdf', controller.streamPublicPdf.bind(controller));

router.use(authenticateToken);

router.get('/', controller.getOrders.bind(controller));
router.post('/', controller.createOrder.bind(controller));
router.put('/:id', controller.updateOrder.bind(controller));
router.post('/:id/chat', controller.addChatMessage.bind(controller));

export default router;
