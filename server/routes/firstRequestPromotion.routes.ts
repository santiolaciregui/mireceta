/** US-016, 2026-11-10: authenticated quote, explicit confirmation and admin switch. */
import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { getCurrentUser } from '../utils/httpHelpers.js';
import { FirstRequestPromotionService } from '../services/FirstRequestPromotionService.js';
import { auditLogService } from '../services/AuditLogService.js';
const router = Router();
const service = new FirstRequestPromotionService();
router.use(authenticateToken);
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
router.post('/quote', async (req, res, next) => {
  try { res.json(await service.quote(getCurrentUser(req), req.body)); } catch (err) { next(err); }
});
router.post('/apply/:orderId', async (req, res, next) => {
  try { res.json(await service.apply(getCurrentUser(req), req.params.orderId, req.body.confirmation)); } catch (err) { next(err); }
});
router.get('/config', async (req, res, next) => {
  try { res.json(await service.config(getCurrentUser(req))); } catch (err) { next(err); }
});
router.put('/config', async (req, res, next) => {
  try {
    const user = getCurrentUser(req);
    const config = await service.config(user, req.body);
    await auditLogService.log({ tenantId: user.tenantId || 'TEN-0001', currentUser: user, action: 'SETTINGS_CHANGE', entity: 'Tenant', entityId: user.tenantId, details: 'First request promotion configuration updated', changes: config });
    res.json(config);
  } catch (err) { next(err); }
});
export default router;
