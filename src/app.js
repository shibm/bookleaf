import express from 'express';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import { createSessionMiddleware } from './config/session.js';
import { loadUser } from './middleware/auth.js';
import { requestSecurity } from './middleware/request-security.js';
import { errorHandler } from './middleware/error-handler.js';
import { createApiRoutes } from './routes/index.js';
import { createSystemRoutes } from './routes/system.routes.js';
import { createTicketJobs } from './services/ticket-jobs.js';

export function createApp({ suggestion, sessionStore } = {}) {
  const app = express();
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '32kb' }));
  app.use(createSessionMiddleware(sessionStore));
  app.use(loadUser, requestSecurity);

  const jobs = createTicketJobs(suggestion);
  // Lifecycle hooks used by startup, graceful shutdown and integration tests.
  app.locals.waitForAI = jobs.wait;
  app.locals.recoverAI = jobs.recover;
  app.use(createSystemRoutes());
  app.use('/api', createApiRoutes(jobs));

  const dist = fileURLToPath(new URL('../dist', import.meta.url));
  app.use(express.static(dist));
  app.get('/{*path}', (_req, res) => res.sendFile(`${dist}/index.html`));
  app.use(errorHandler);
  return app;
}
