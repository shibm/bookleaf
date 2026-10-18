import type { PublicUser, UserRecord } from '../types.ts';
import { authenticatedUser } from '../middleware/auth.ts';
import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { authenticate } from '../services/auth.service.ts';

const publicUser: (user: UserRecord) => PublicUser = (
  user: UserRecord,
): PublicUser => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export class AuthController {
  static async csrf(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      res.json({ data: { csrfToken: req.session.csrf } });
    } catch (error) {
      next(error);
    }
  }

  static async login(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user: UserRecord = await authenticate(req.body);
      await promisify(req.session.regenerate).call(req.session);
      req.session.userId = user._id;
      req.session.csrf = randomBytes(24).toString('hex');
      await promisify(req.session.save).call(req.session);
      res.json({
        data: { user: publicUser(user), csrfToken: req.session.csrf },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await promisify(req.session.destroy).call(req.session);
      res.clearCookie('bookleaf.sid');
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  static async me(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      res.json({ data: publicUser(authenticatedUser(req)) });
    } catch (error) {
      next(error);
    }
  }
}
