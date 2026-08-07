import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/ChatService.js';
import { getCurrentUser } from '../utils/httpHelpers.js';

export class ChatController {
  getConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversations = await chatService.getConversations(getCurrentUser(req));
      res.json(conversations);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  getPatientChat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dni } = req.params;
      const chat = await chatService.getPatientChat(dni, getCurrentUser(req));
      res.json(chat);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dniOrId = req.params.dni || req.params.id;
      const result = await chatService.sendMessage(dniOrId, req.body, getCurrentUser(req));
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
