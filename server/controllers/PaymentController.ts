import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/PaymentService.js';

const paymentService = new PaymentService();

export class PaymentController {
  async createPreference(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.body.tenantId || (req.user as any)?.tenantId || 'TEN-0001';
      const result = await paymentService.createPreference(tenantId, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.processWebhook(req.query, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(200).json({ received: true });
    }
  }
}
