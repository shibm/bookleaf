import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.ts';

export class DashboardRoutes {
  router: Router;

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  registerRoutes(): void {
    this.router.get('/', DashboardController.getDashboard);
  }
}
