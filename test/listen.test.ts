import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listen } from '../src/listen.ts';

test('startup resolves only after binding and preserves port-conflict errors', async () => {
  const server = await listen((_req, res) => res.end('ok'), 0);
  try {
    const port = (server.address() as AddressInfo).port;
    assert.ok(port > 0);
    await assert.rejects(
      listen(() => {}, port),
      { code: 'EADDRINUSE' },
    );
    assert.equal(await (await fetch(`http://localhost:${port}`)).text(), 'ok');
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
