import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new NotificationController();

// Public Meta Cloud API WhatsApp Webhook Endpoints
router.get('/whatsapp/webhook', controller.verifyWebhook);
router.post('/whatsapp/webhook', controller.handleInboundWebhook);

// Protected notification routes
router.use(authenticateToken);

router.get('/configs', controller.getConfigs);
router.put('/configs/:channel', controller.saveConfig);
router.post('/configs/:channel/test', controller.testConnection);

router.get('/templates', controller.getTemplates);
router.post('/templates', controller.saveTemplate);

router.post('/send', controller.sendNotification);
router.get('/logs', controller.getLogs);

export default router;
