import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';

const authService = new AuthService();

export class AuthController {
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ error: 'Identificador y contraseña requeridos.' });
      }
      const result = await authService.login(identifier, password);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  };

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identifier, email } = req.body;
      if (!identifier && !email) {
        return res.status(400).json({ error: 'Por favor ingrese su correo o DNI de usuario.' });
      }
      const result = await authService.forgotPassword(identifier, email);
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };
}
