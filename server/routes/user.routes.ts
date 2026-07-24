import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new UserController();

router.use(authenticateToken);

router.get('/me', controller.getProfile.bind(controller));
router.post('/change-password', controller.changePassword.bind(controller));
router.get('/', controller.getUsersByTenant.bind(controller));
router.post('/', controller.createUser.bind(controller));
router.put('/:id', controller.updateUser.bind(controller));
router.delete('/:id', controller.deleteUser.bind(controller));

export default router;
