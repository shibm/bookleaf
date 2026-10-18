import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { CATEGORIES, PRIORITIES, STATUSES } from '../constants.ts';

export class SystemController {
  static async health(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const connected: boolean = mongoose.connection.readyState === 1;
      res
        .status(connected ? 200 : 503)
        .json({ status: connected ? 'ok' : 'unavailable' });
    } catch (error) {
      next(error);
    }
  }

  static async meta(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      res.json({
        data: {
          categories: CATEGORIES,
          priorities: PRIORITIES,
          statuses: STATUSES,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
