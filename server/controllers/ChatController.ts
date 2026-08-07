import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/ChatService.js';

export class ChatController {
  async getConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const conversations = await chatService.getConversations(req.user);
      res.json(conversations);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getPatientChat(req: Request, res: Response, next: NextFunction) {
    try {
      const { dni } = req.params;
      const chat = await chatService.getPatientChat(dni, req.user);
      res.json(chat);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const dniOrId = req.params.dni || req.params.id;
      const result = await chatService.sendMessage(dniOrId, req.body, req.user);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
