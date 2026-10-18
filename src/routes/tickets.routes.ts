import { Router } from 'express';
import { TicketsController } from '../controllers/tickets.controller.ts';
import { requireAdmin } from '../middleware/auth.ts';
import { createDraftLimiter } from '../middleware/rate-limits.ts';

export class TicketsRoutes {
  router: Router;

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  registerRoutes(): void {
    this.router
      .route('/')
      .get(TicketsController.list)
      .post(TicketsController.create);
    this.router
      .route('/:id')
      .get(TicketsController.get)
      .patch(requireAdmin, TicketsController.update);
    this.router.post('/:id/messages', TicketsController.addMessage);
    this.router.post(
      '/:id/draft',
      requireAdmin,
      createDraftLimiter(),
      TicketsController.draft,
    );
  }
}
