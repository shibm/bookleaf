import type { Store } from 'express-session';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
export function createSessionMiddleware(sessionStore?: Store) {
  const production = process.env.NODE_ENV === 'production';
  if (
    production &&
    (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
  )
    throw new Error(
      'Production requires SESSION_SECRET with at least 32 characters',
    );
  return session({
    name: 'bookleaf.sid',
    secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
    store:
      sessionStore ||
      MongoStore.create({
        // Mongoose and connect-mongo install separate copies of the MongoDB driver.
        client: mongoose.connection.getClient() as unknown as Parameters<
          typeof MongoStore.create
        >[0]['client'],
        dbName: mongoose.connection.name,
        collectionName: 'sessions',
        // MongoDB's TTL index is created and awaited in connectDatabase().
        autoRemove: 'disabled',
      }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: production,
      maxAge: 8 * 3600000,
    },
  });
}
