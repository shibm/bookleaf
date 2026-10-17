import { User } from '../db.js';
import { failure } from '../utils/http-error.js';
export async function loadUser(req, _res, next) {
  if (req.session.userId)
    req.user = await User.findById(req.session.userId).lean();
  next();
}
export const requireAuth = (req, _res, next) =>
  req.user ? next() : next(failure(401, 'Please log in.'));
export const requireAdmin = (req, _res, next) =>
  req.user?.role === 'admin'
    ? next()
    : next(failure(403, 'Admin access required.'));
