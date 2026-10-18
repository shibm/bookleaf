import { Router } from 'express';
import { SystemController } from '../controllers/system.controller.ts';

export class SystemRoutes {
  router: Router;

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  registerRoutes(): void {
    this.router.get('/health', SystemController.health);
  }
}
