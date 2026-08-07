import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/PaymentService.js';
import { getTenantId } from '../utils/httpHelpers.js';

const paymentService = new PaymentService();

export class PaymentController {
  createPreference = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.body.tenantId || getTenantId(req);
      const result = await paymentService.createPreference(tenantId, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  webhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await paymentService.processWebhook(req.query, req.body, req.headers);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(200).json({ received: true });
    }
  };

  getStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.orderId;
      const result = await paymentService.getPaymentStatus(orderId);
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };
}
