import { Router } from 'express';
import { createTicketController } from '../controllers/tickets.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { createDraftLimiter } from '../middleware/rate-limits.js';
export function createTicketRoutes(jobs) {
  const router = Router();
  const controller = createTicketController(jobs);
  router.route('/').get(controller.list).post(controller.create);
  router
    .route('/:id')
    .get(controller.get)
    .patch(requireAdmin, controller.update);
  router.post('/:id/messages', controller.addMessage);
  router.post(
    '/:id/draft',
    requireAdmin,
    createDraftLimiter(),
    controller.draft,
  );
  return router;
}
