import mongoose from 'mongoose';
import { CATEGORIES, PRIORITIES, STATUSES } from '../constants.js';
export const health = (_req, res) =>
  res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable',
  });
export const meta = (_req, res) =>
  res.json({
    data: {
      categories: CATEGORIES,
      priorities: PRIORITIES,
      statuses: STATUSES,
    },
  });
