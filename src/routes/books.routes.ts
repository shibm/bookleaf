import { Router } from 'express';
import { BooksController } from '../controllers/books.controller.ts';

export class BooksRoutes {
  router: Router;

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  registerRoutes(): void {
    this.router.get('/', BooksController.listBooks);
  }
}
