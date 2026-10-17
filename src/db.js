import mongoose from 'mongoose';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CATEGORIES, PRIORITIES, STATUSES } from './constants.js';
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, hash) {
  const [salt, key] = hash.split(':');
  return timingSafeEqual(
    Buffer.from(key, 'hex'),
    scryptSync(password, salt, 64),
  );
}
const userSchema = new mongoose.Schema(
  {
    _id: String,
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['author', 'admin'], required: true },
    password_hash: { type: String, required: true, select: false },
    profile: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { versionKey: false },
);
const bookSchema = new mongoose.Schema(
  {
    _id: String,
    author_id: { type: String, ref: 'User', required: true, index: true },
    details: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { versionKey: false },
);
const ticketSchema = new mongoose.Schema(
  {
    author_id: { type: String, ref: 'User', required: true, index: true },
    book_id: { type: String, ref: 'Book', default: null },
    subject: { type: String, required: true, maxLength: 160 },
    description: { type: String, required: true, maxLength: 8000 },
    status: { type: String, enum: STATUSES, default: 'Open' },
    category: { type: String, enum: CATEGORIES, required: true },
    priority: { type: String, enum: PRIORITIES, required: true },
    assigned_to: { type: String, ref: 'User', default: null },
    ai_state: {
      type: String,
      enum: ['pending', 'ready', 'fallback'],
      default: 'pending',
    },
    draft: { type: String, default: '' },
    ai_reason: String,
    version: { type: Number, default: 1 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
ticketSchema.index({ status: 1, priority: 1, created_at: 1 });
const messageSchema = new mongoose.Schema(
  {
    ticket_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    user_id: { type: String, ref: 'User', required: true },
    body: { type: String, required: true, maxLength: 10000 },
    internal: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
export const User = mongoose.model('User', userSchema);
export const Book = mongoose.model('Book', bookSchema);
export const Ticket = mongoose.model('Ticket', ticketSchema);
export const Message = mongoose.model('Message', messageSchema);
export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri)
    throw new Error(
      'MONGODB_URI is required. Copy .env.example to .env and set your MongoDB connection string.',
    );
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all([User.init(), Book.init(), Ticket.init(), Message.init()]);
  return mongoose.connection;
}
export async function seed() {
  const data = JSON.parse(
    readFileSync(new URL('../data/sample-data.json', import.meta.url), 'utf8'),
  );
  const authorHash = hashPassword(
    process.env.DEMO_AUTHOR_PASSWORD || 'AuthorDemo!2026',
  );
  for (const { books, ...author } of data.authors) {
    await User.updateOne(
      { _id: author.author_id },
      {
        $setOnInsert: {
          email: author.email,
          name: author.name,
          role: 'author',
          password_hash: authorHash,
          profile: author,
        },
      },
      { upsert: true },
    );
    for (const book of books)
      await Book.updateOne(
        { _id: book.book_id },
        { $setOnInsert: { author_id: author.author_id, details: book } },
        { upsert: true },
      );
  }
  await User.updateOne(
    { _id: 'ADMIN001' },
    {
      $setOnInsert: {
        email: 'admin@bookleaf.com',
        name: 'BookLeaf Operations',
        role: 'admin',
        password_hash: hashPassword(
          process.env.DEMO_ADMIN_PASSWORD || 'AdminDemo!2026',
        ),
        profile: {},
      },
    },
    { upsert: true },
  );
}
