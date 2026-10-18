import { authenticatedUser } from '../middleware/auth.ts';
import type { Request, Response, NextFunction } from 'express';
import { getDashboard } from '../services/dashboard.service.ts';

export class DashboardController {
  static async getDashboard(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      res.json({ data: await getDashboard(authenticatedUser(req)) });
    } catch (error) {
      next(error);
    }
  }
}
