import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import tenantRoutes from './tenant.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tenants', tenantRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
// Legacy compatibility (since resolve tenant was on /tenant/resolve)
router.use('/tenant', tenantRoutes);

export default router;
