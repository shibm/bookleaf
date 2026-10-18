import { authenticatedUser } from '../middleware/auth.ts';
import type { Request, Response, NextFunction } from 'express';
import { listBooks } from '../services/books.service.ts';

export class BooksController {
  static async listBooks(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      res.json({ data: await listBooks(authenticatedUser(req)) });
    } catch (error) {
      next(error);
    }
  }
}
