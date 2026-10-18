import { Router } from 'express';
import { AuthRoutes } from './auth.routes.ts';
import { BooksRoutes } from './books.routes.ts';
import { DashboardRoutes } from './dashboard.routes.ts';
import { TicketsRoutes } from './tickets.routes.ts';
import { SystemController } from '../controllers/system.controller.ts';
import { requireAuth } from '../middleware/auth.ts';
import { failure } from '../utils/http-error.ts';

export class ApiRoutes {
  router: Router;

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  registerRoutes(): void {
    this.router.use('/auth', new AuthRoutes().router);
    this.router.get('/meta', requireAuth, SystemController.meta);
    this.router.use('/books', requireAuth, new BooksRoutes().router);
    this.router.use('/dashboard', requireAuth, new DashboardRoutes().router);
    this.router.use('/tickets', requireAuth, new TicketsRoutes().router);
    this.router.use((_req, _res, next) =>
      next(failure(404, 'Endpoint not found.')),
    );
  }
}
