import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/PaymentService.js';
import {runAnalyticsMaintenance} from '../services/analyticsStore.js';
import { getTenantId, getCurrentUser } from '../utils/httpHelpers.js';
import { writeFlowAudit, providerErrorEvidence } from '../services/orderFlowAudit.js';

const paymentService = new PaymentService();

export class PaymentController {
  createPreference = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const result = await paymentService.createPreference(tenantId, req.body, getCurrentUser(req));
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  webhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await paymentService.processWebhook(req.query, req.body, req.headers);
      if (result.retryable) res.setHeader('Retry-After', '60');
      res.status(result.httpStatus || 200).json(result);
    } catch (err: any) {
      await writeFlowAudit(undefined, 'webhook_failed', undefined, {
        ...providerErrorEvidence(err), reason: 'controller_error', tenantUnresolved: true,
      });
      res.setHeader('Retry-After', '60');
      res.status(503).json({ received: false, retryable: true, error: 'Payment processing is temporarily unavailable.' });
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

  syncReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId, ...returnData } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: 'orderId es requerido' });
      }
      const result = await paymentService.syncReturn(orderId, returnData);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  reconcilePending = async (req: Request, res: Response, next: NextFunction) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return res.status(503).json({ error: 'Payment reconciliation is not configured.' });
    }
    if (req.get('authorization') !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    try {
      const rawLimit = Number(req.query.limit || 100);
      const limit = Number.isFinite(rawLimit) ? rawLimit : 100;
      const result = await paymentService.reconcilePendingPayments(limit);
      await runAnalyticsMaintenance();
      res.json(result);
    } catch (err: any) {
      next(err);
    }
  };
}
