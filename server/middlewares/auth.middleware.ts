import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// Keep configuration/key failures alertable even though JWT uses the same error class.
const invalidTokenMessages = new Set([
  'jwt malformed',
  'invalid token',
  'jwt signature is required',
  'invalid algorithm',
  'invalid signature',
  'invalid nbf value',
  'invalid exp value',
]);

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Falta token de autenticación.' });
  }

  jwt.verify(token, config.JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      res.locals.invalidAuthToken = err instanceof jwt.TokenExpiredError
        || err instanceof jwt.NotBeforeError
        || (err instanceof jwt.JsonWebTokenError && invalidTokenMessages.has(err.message));
      return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
    req.user = decoded;
    next();
  });
};
