import { rateLimit } from 'express-rate-limit';
export const createLoginLimiter = () =>
  rateLimit({
    windowMs: 15 * 60000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { message: 'Too many login attempts. Try later.' } },
  });
export const createDraftLimiter = () =>
  rateLimit({
    windowMs: 60000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { message: 'Draft limit reached. Try again shortly.' } },
  });
