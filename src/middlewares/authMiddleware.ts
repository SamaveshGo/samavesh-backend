import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'samavesh_jwt_secret_token_123_456';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'controller' | 'driver' | 'commuter';
  };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: 'controller' | 'driver' | 'commuter' };
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};
