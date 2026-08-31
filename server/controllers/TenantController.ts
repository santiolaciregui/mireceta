import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/TenantService.js';
import { getTenantId, getCurrentUser } from '../utils/httpHelpers.js';

const tenantService = new TenantService();

export class TenantController {
  getTenants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenants = await tenantService.getTenants();
      res.json(tenants.map((t: any) => ({ id: t.id, name: t.name })));
    } catch (err: any) {
      next(err);
    }
  };

  resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tenantService.resolveTenant(req.query.subdomain as string);
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };

  createTenant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tenantService.createTenant(req.body, getCurrentUser(req));
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  };

  getPaymentConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const result = await tenantService.getPaymentConfig(tenantId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  updatePaymentConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const result = await tenantService.updatePaymentConfig(tenantId, req.body, getCurrentUser(req));
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  };

  getTariffs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const result = await tenantService.getTariffs(tenantId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  updateTariffs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const result = await tenantService.updateTariffs(tenantId, req.body, getCurrentUser(req));
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  };
}
