import { Router } from 'express';
import { health } from '../controllers/system.controller.js';

export function createSystemRoutes() {
  const router = Router();
  router.get('/health', health);
  return router;
}
