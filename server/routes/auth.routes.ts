import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { UserController } from '../controllers/UserController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new AuthController();
const userController = new UserController();

router.post('/login', controller.login.bind(controller));
router.post('/register', controller.register.bind(controller));
router.post('/forgot-password', controller.forgotPassword.bind(controller));
router.get('/me', authenticateToken, userController.getProfile.bind(userController));

export default router;
