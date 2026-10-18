import mongoose from 'mongoose';
import { User, Book, Ticket, Message } from '../models/index.ts';

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri)
    throw new Error(
      'MONGODB_URI is required. Copy .env.example to .env and set your MongoDB connection string.',
    );
  // Atlas connection strings often omit the database. Keep this application's
  // collections out of MongoDB's shared default `test` database.
  const hasDatabase = /^mongodb(?:\+srv)?:\/\/[^/]+\/[^?]+/.test(uri);
  const dbName =
    process.env.MONGODB_DB_NAME || (hasDatabase ? undefined : 'bookleaf');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    ...(dbName ? { dbName } : {}),
  });
  await Promise.all([User.init(), Book.init(), Ticket.init(), Message.init()]);
  // Finish session index setup before constructing the app or accepting requests.
  // connect-mongo otherwise creates this index in an unawaited background promise.
  await mongoose.connection
    .collection('sessions')
    .createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
  return mongoose.connection;
}
