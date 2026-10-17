import { Router } from 'express';
import { listBooks } from '../controllers/books.controller.js';
export function createBooksRoutes() {
  const router = Router();
  router.get('/', listBooks);
  return router;
}
