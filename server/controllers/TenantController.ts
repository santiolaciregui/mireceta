import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/TenantService.js';

const tenantService = new TenantService();

export class TenantController {
  async getTenants(req: Request, res: Response, next: NextFunction) {
    try {
      const tenants = await tenantService.getTenants();
      res.json(tenants.map((t: any) => ({ id: t.id, name: t.name })));
    } catch (err: any) {
      next(err);
    }
  }

  async resolveTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await tenantService.resolveTenant(req.query.subdomain as string);
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }

  async createTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await tenantService.createTenant(req.body, req.user);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  }

  async getPaymentConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.user as any)?.tenantId || 'TEN-0001';
      const result = await tenantService.getPaymentConfig(tenantId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async updatePaymentConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.user as any)?.tenantId || 'TEN-0001';
      const result = await tenantService.updatePaymentConfig(tenantId, req.body, req.user);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  }
}
