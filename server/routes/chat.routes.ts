import { Router } from 'express';
import { ChatController } from '../controllers/ChatController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new ChatController();

router.use(authenticateToken);

// List unique patient conversations for doctor/admin
router.get('/conversations', controller.getConversations.bind(controller));

// Specific patient chat
router.get('/:dni', controller.getPatientChat.bind(controller));
router.post('/:dni', controller.sendMessage.bind(controller));
router.post('/patient/:dni', controller.sendMessage.bind(controller));

export default router;
