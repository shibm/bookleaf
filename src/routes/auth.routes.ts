import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.ts';
import { requireAuth } from '../middleware/auth.ts';
import { createLoginLimiter } from '../middleware/rate-limits.ts';

export class AuthRoutes {
  router: Router;

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  registerRoutes(): void {
    this.router.get('/csrf', AuthController.csrf);
    this.router.post('/login', createLoginLimiter(), AuthController.login);
    this.router.post('/logout', requireAuth, AuthController.logout);
    this.router.get('/me', requireAuth, AuthController.me);
  }
}
