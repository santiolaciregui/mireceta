import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { UserController } from '../controllers/UserController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new AuthController();
const userController = new UserController();

router.post('/login', controller.login);
router.post('/register', controller.register);
router.post('/forgot-password', controller.forgotPassword);
router.get('/me', authenticateToken, userController.getProfile);

export default router;
