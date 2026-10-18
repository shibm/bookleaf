import type { Store } from 'express-session';
import type { SuggestionGenerator } from './types.ts';
import express from 'express';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import { createSessionMiddleware } from './config/session.ts';
import { loadUser } from './middleware/auth.ts';
import { requestSecurity } from './middleware/request-security.ts';
import { errorHandler } from './middleware/error-handler.ts';
import { ApiRoutes } from './routes/index.ts';
import { SystemRoutes } from './routes/system.routes.ts';
import { createTicketJobs } from './services/ticket-jobs.ts';

export function createApp({
  suggestion,
  sessionStore,
}: { suggestion?: SuggestionGenerator; sessionStore?: Store } = {}) {
  const app = express();
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '32kb' }));
  app.use(createSessionMiddleware(sessionStore));
  app.use(loadUser, requestSecurity);

  const jobs = createTicketJobs(suggestion);
  app.locals.ticketJobs = jobs;
  // Lifecycle hooks used by startup, graceful shutdown and integration tests.
  app.locals.waitForAI = jobs.wait;
  app.locals.recoverAI = jobs.recover;
  app.use(new SystemRoutes().router);
  app.use('/api', new ApiRoutes().router);

  const dist = fileURLToPath(new URL('../dist', import.meta.url));
  app.use(express.static(dist));
  app.get('/{*path}', (_req, res) => res.sendFile(`${dist}/index.html`));
  app.use(errorHandler);
  return app;
}
