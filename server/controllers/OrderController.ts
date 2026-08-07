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

  async streamPublicPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const order: any = await orderService.getOrderById(id);
      if (!order || !order.recipePdfUrl) {
        return res.status(404).send('Receta no encontrada o pendiente de emisión.');
      }

      const pdfUrl = order.recipePdfUrl;

      if (pdfUrl.startsWith('data:application/pdf;base64,')) {
        const base64Data = pdfUrl.replace(/^data:application\/pdf;base64,/, '');
        const pdfBuffer = Buffer.from(base64Data, 'base64');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="receta_${order.id}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        return res.end(pdfBuffer);
      } else if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
        return res.redirect(pdfUrl);
      } else {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="receta_${order.id}.pdf"`);
        return res.send(pdfUrl);
      }
    } catch (err: any) {
      res.status(500).send('Error al obtener el archivo de la receta.');
    }
  }
}
