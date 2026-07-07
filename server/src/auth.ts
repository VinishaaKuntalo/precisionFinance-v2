import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

// Read lazily so it works regardless of dotenv initialization order,
// and fail loudly in production instead of silently using a known dev key.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return 'dev-secret-key';
  }
  return secret;
}

export interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: number; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateToken(userId: number, email: string) {
  return jwt.sign({ userId, email }, getJwtSecret(), { expiresIn: '30d' });
}
