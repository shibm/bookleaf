import { authenticatedUser } from '../middleware/auth.ts';
import type { Request, Response, NextFunction } from 'express';
import * as tickets from '../services/ticket.service.ts';

export class TicketsController {
  static async list(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      res.json(await tickets.listTickets(req.query, authenticatedUser(req)));
    } catch (error) {
      next(error);
    }
  }

  static async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      res.status(201).json({
        data: await tickets.createTicket(
          req.body,
          authenticatedUser(req),
          req.app.locals.ticketJobs,
        ),
      });
    } catch (error) {
      next(error);
    }
  }

  static async get(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      res.json({
        data: await tickets.getConversation(
          String(req.params.id),
          authenticatedUser(req),
        ),
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      res.json({
        data: await tickets.updateTicket(
          String(req.params.id),
          req.body,
          authenticatedUser(req),
        ),
      });
    } catch (error) {
      next(error);
    }
  }

  static async addMessage(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await tickets.addMessage(
        String(req.params.id),
        req.body,
        authenticatedUser(req),
      );
      res.status(201).json({ data: { message: 'Message saved.' } });
    } catch (error) {
      next(error);
    }
  }

  static async draft(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await tickets.queueDraft(
        String(req.params.id),
        authenticatedUser(req),
        req.app.locals.ticketJobs,
      );
      res.status(202).json({ data: { message: 'Draft generation queued.' } });
    } catch (error) {
      next(error);
    }
  }
}
