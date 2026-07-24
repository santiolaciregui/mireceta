import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService.js';

const orderService = new OrderService();

export class OrderController {
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await orderService.getOrdersForUser(req.user);
      res.json(orders);
    } catch (err: any) {
      next(err);
    }
  }

  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.createOrder(req.body, req.user);
      res.status(201).json(order);
    } catch (err: any) {
      next(err);
    }
  }

  async updateOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.updateOrder(req.params.id, req.body, req.user);
      res.json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async addChatMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.addChatMessage(req.params.id, req.body, req.user);
      res.json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
