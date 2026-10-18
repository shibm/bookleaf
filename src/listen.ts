import type { RequestListener } from 'node:http';
import { createServer } from 'node:http';

export async function listen(app: RequestListener, port: number) {
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      server.off('error', reject);
      resolve();
    });
  });
  return server;
}
