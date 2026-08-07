import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new NotificationController();

// Public Meta Cloud API WhatsApp Webhook Endpoints
router.get('/whatsapp/webhook', (req, res, next) => controller.verifyWebhook(req, res, next));
router.post('/whatsapp/webhook', (req, res, next) => controller.handleInboundWebhook(req, res, next));

// Protected notification routes
router.use(authenticateToken);

router.get('/configs', (req, res, next) => controller.getConfigs(req, res, next));
router.put('/configs/:channel', (req, res, next) => controller.saveConfig(req, res, next));
router.post('/configs/:channel/test', (req, res, next) => controller.testConnection(req, res, next));

router.get('/templates', (req, res, next) => controller.getTemplates(req, res, next));
router.post('/templates', (req, res, next) => controller.saveTemplate(req, res, next));

router.post('/send', (req, res, next) => controller.sendNotification(req, res, next));
router.get('/logs', (req, res, next) => controller.getLogs(req, res, next));

export default router;
