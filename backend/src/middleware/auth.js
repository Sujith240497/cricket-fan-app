import jwt from 'jsonwebtoken';
import { unauthorized } from '../utils/response.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fan-identity-cricket-secret-key-change-in-production';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided');
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
}

export function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}
