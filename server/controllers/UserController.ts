import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService.js';

const userService = new UserService();

export class UserController {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.getProfile(req.user.id);
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      await userService.changePassword(req.user.id, currentPassword, newPassword);
      res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getUsersByTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.getUsersByTenant(req.user.tenantId);
      res.json(result);
    } catch (err: any) {
      next(err);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.createUser(req.body, req.user);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.updateUser(req.params.id, req.body, req.user);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      await userService.deleteUser(req.params.id, req.user);
      res.json({ message: 'Usuario eliminado' });
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  }
}
