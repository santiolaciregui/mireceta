import { Router } from 'express';
import { ChatController } from '../controllers/ChatController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new ChatController();

router.use(authenticateToken);

router.get('/conversations', controller.getConversations);
router.get('/:dni', controller.getPatientChat);
router.post('/:dni', controller.sendMessage);
router.post('/patient/:dni', controller.sendMessage);

export default router;
