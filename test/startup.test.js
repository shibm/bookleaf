import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { listen } from '../src/listen.js';

// Exercise the real CLI failure path, including session-store initialization and cleanup.
test(
  'occupied-port startup exits cleanly without MongoDB errors or AI recovery',
  { timeout: 30000 },
  async () => {
    const mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri('bookleaf_startup_test');
    const connection = await mongoose.createConnection(uri).asPromise();
    const occupied = await listen(
      (_req, res) => res.end('existing backend'),
      0,
    );
    let child;
    try {
      await connection
        .collection('tickets')
        .insertOne({ ai_state: 'pending', author_id: 'NOT_AN_AUTHOR' });
      child = spawn(process.execPath, ['src/server.js'], {
        cwd: new URL('..', import.meta.url),
        env: {
          ...process.env,
          MONGODB_URI: uri,
          MONGODB_DB_NAME: 'bookleaf_startup_test',
          PORT: String(occupied.address().port),
          NODE_ENV: 'test',
          SEED_DEMO: 'false',
          OPENAI_API_KEY: '',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', (chunk) => (output += chunk));
      child.stderr.on('data', (chunk) => (output += chunk));
      const code = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error('Startup did not exit after the port conflict.'));
        }, 15000);
        child.once('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });
        child.once('close', (code) => {
          clearTimeout(timer);
          resolve(code);
        });
      });
      assert.equal(code, 1, output);
      assert.match(output, /already in use/);
      assert.doesNotMatch(
        output,
        /MongoClientClosedError|UnhandledPromiseRejection|AI job failed|BookLeaf running/,
      );
      assert.equal(
        await connection
          .collection('tickets')
          .countDocuments({ ai_state: 'pending' }),
        1,
      );
      assert.equal(
        await (
          await fetch(`http://localhost:${occupied.address().port}`)
        ).text(),
        'existing backend',
      );
    } finally {
      if (child && child.exitCode === null && child.signalCode === null)
        child.kill('SIGKILL');
      await new Promise((resolve) => occupied.close(resolve));
      await connection.close();
      await mongo.stop();
    }
  },
);
