import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new UserController();

router.use(authenticateToken);

router.get('/me', controller.getProfile);
router.post('/change-password', controller.changePassword);
router.get('/', controller.getUsersByTenant);
router.post('/', controller.createUser);
router.put('/:id', controller.updateUser);
router.delete('/:id', controller.deleteUser);

export default router;
