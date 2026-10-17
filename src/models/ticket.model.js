import mongoose from 'mongoose';
import { CATEGORIES, PRIORITIES, STATUSES } from '../constants.js';

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

export const Ticket = mongoose.model('Ticket', ticketSchema);
