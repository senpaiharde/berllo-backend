import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string };
  }
}

const JWT_SECRET = process.env.JWT_SECRET as string;

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer '))
    return void res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { id?: string };
    if (!decoded.id) return void res.status(401).json({ error: 'Invalid token payload' });

    req.user = { id: decoded.id };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
