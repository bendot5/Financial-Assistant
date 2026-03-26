import { Request, Response, NextFunction } from 'express';
import { admin } from '../../lib/firebaseAdmin.js';

export interface AuthUser {
  uid: string;
  email: string;
}

// Extend Express Request so downstream route handlers get req.user typed
export interface AuthRequest extends Request {
  user: AuthUser;
}

export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Authorization header missing' });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    (req as AuthRequest).user = {
      uid: decoded.uid,
      email: decoded.email ?? '',
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
