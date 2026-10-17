import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { createLoginLimiter } from '../middleware/rate-limits.js';
export function createAuthRoutes() {
  const router = Router();
  router.get('/csrf', auth.csrf);
  router.post('/login', createLoginLimiter(), auth.login);
  router.post('/logout', requireAuth, auth.logout);
  router.get('/me', requireAuth, auth.me);
  return router;
}
