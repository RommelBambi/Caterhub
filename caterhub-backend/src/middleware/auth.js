// src/middleware/auth.js (ESM)
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * Verifies Bearer token and attaches { id, role, catererId? } to req.user
 */
export function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const payload = jwt.verify(token, JWT_SECRET);
    // expected payload shape: { id, role, catererId? }
    req.user = {
      id: Number(payload.id),
      role: payload.role,
      catererId: payload.catererId ?? null,
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional: gate an endpoint to specific roles
 *   r.use(requireRole('ADMIN')) // example
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
