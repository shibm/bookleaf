import type { Request, RequestHandler } from 'express';
import { User } from '../models/index.ts';
import { failure } from '../utils/http-error.ts';
export const loadUser: RequestHandler = async (req, _res, next) => {
  if (req.session.userId)
    req.user = await User.findById(req.session.userId).lean();
  next();
};
export const requireAuth: RequestHandler = (req, _res, next) =>
  req.user ? next() : next(failure(401, 'Please log in.'));
export const requireAdmin: RequestHandler = (req, _res, next) =>
  req.user?.role === 'admin'
    ? next()
    : next(failure(403, 'Admin access required.'));

export function authenticatedUser(req: Request) {
  if (!req.user) throw failure(401, 'Please log in.');
  return req.user;
}
