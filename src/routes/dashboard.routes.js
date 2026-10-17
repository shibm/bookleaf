import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
export function createDashboardRoutes() {
  const router = Router();
  router.get('/', getDashboard);
  return router;
}
