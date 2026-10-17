import { Router } from 'express';
import { createAuthRoutes } from './auth.routes.js';
import { createBooksRoutes } from './books.routes.js';
import { createDashboardRoutes } from './dashboard.routes.js';
import { createTicketRoutes } from './tickets.routes.js';
import { meta } from '../controllers/system.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { failure } from '../utils/http-error.js';
export function createApiRoutes(jobs) {
  const router = Router();
  router.use('/auth', createAuthRoutes());
  router.get('/meta', requireAuth, meta);
  router.use('/books', requireAuth, createBooksRoutes());
  router.use('/dashboard', requireAuth, createDashboardRoutes());
  router.use('/tickets', requireAuth, createTicketRoutes(jobs));
  router.use((_req, _res, next) => next(failure(404, 'Endpoint not found.')));
  return router;
}
