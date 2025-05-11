import { request, res, NextFunction, response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';




declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string };
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('Missing JWT_SECRET in .env');
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (!decoded || typeof decoded !== 'object' || !decoded.id) {
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }

    req.user = { id: decoded.id };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
