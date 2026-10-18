import type { RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';
import { failure } from '../utils/http-error.ts';
export const requestSecurity: RequestHandler = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!req.session.csrf) req.session.csrf = randomBytes(24).toString('hex');
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.headers['x-csrf-token'] !== req.session.csrf
  )
    throw failure(403, 'Invalid CSRF token. Reload and try again.');
  next();
};
