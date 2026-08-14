import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService.js';
import { getCurrentUser } from '../utils/httpHelpers.js';
import { storageService } from '../services/storage/StorageService.js';

const orderService = new OrderService();

export class OrderController {
  getOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = await orderService.getOrdersForUser(getCurrentUser(req));
      res.json(orders);
    } catch (err: any) {
      next(err);
    }
  };

  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await orderService.createOrder(req.body, getCurrentUser(req));
      res.status(201).json(order);
    } catch (err: any) {
      next(err);
    }
  };

  updateOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await orderService.updateOrder(req.params.id, req.body, getCurrentUser(req));
      res.json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  addChatMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await orderService.addChatMessage(req.params.id, req.body, getCurrentUser(req));
      res.json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  streamPublicPdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const order: any = await orderService.getOrderById(id);
      if (!order || !order.recipePdfUrl) {
        return res.status(404).send('Receta no encontrada o pendiente de emisión.');
      }

      const pdfUrl = order.recipePdfUrl;

      if (pdfUrl.startsWith('data:')) {
        const match = pdfUrl.match(/^data:([^;]+);base64,/);
        const mimeType = match ? match[1] : 'application/pdf';
        const cleanBase64 = pdfUrl.replace(/^data:[^;]+;base64,/, '');
        const fileBuffer = Buffer.from(cleanBase64, 'base64');

        let ext = 'pdf';
        if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('jpeg')) ext = 'jpg';
        else if (mimeType.includes('jpg')) ext = 'jpg';
        else if (mimeType.includes('webp')) ext = 'webp';

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="receta_${order.id}.${ext}"`);
        res.setHeader('Content-Length', fileBuffer.length);
        return res.end(fileBuffer);
      } else if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
        return res.redirect(pdfUrl);
      } else {
        const fileData = await storageService.getRecipeFile(pdfUrl);
        if (fileData) {
          res.setHeader('Content-Type', fileData.mimeType);
          let ext = 'pdf';
          if (fileData.mimeType.includes('png')) ext = 'png';
          else if (fileData.mimeType.includes('jpeg')) ext = 'jpg';
          else if (fileData.mimeType.includes('jpg')) ext = 'jpg';
          else if (fileData.mimeType.includes('webp')) ext = 'webp';

          res.setHeader('Content-Disposition', `inline; filename="receta_${order.id}.${ext}"`);
          return res.send(fileData.buffer);
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="receta_${order.id}.pdf"`);
        return res.send(pdfUrl);
      }
    } catch (err: any) {
      res.status(500).send('Error al obtener el archivo de la receta.');
    }
  };

  deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await orderService.deleteOrder(req.params.id, getCurrentUser(req));
      res.json(result);
    } catch (err: any) {
      const isNotFound = err.message === 'Solicitud no encontrada.';
      res.status(isNotFound ? 404 : 400).json({ error: err.message });
    }
  };

  sendRecipeLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { channel } = req.body;
      if (!channel || !['whatsapp', 'email', 'both'].includes(channel)) {
        return res.status(400).json({ error: 'Canal no válido. Debe ser whatsapp, email o both.' });
      }

      const result = await orderService.sendRecipeLink(req.params.id, channel, getCurrentUser(req));
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}

