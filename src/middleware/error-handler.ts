import type { ErrorRequestHandler } from 'express';
export const errorHandler: ErrorRequestHandler = (
  caught: unknown,
  _req,
  res,
  _next,
) => {
  const error = caught instanceof Error ? caught : new Error('Unknown error');
  const status =
    ('status' in error && typeof error.status === 'number'
      ? error.status
      : undefined) || (error.name === 'ValidationError' ? 422 : 500);
  if (status === 500) console.error('Request failed:', error.message);
  res.status(status).json({
    error: {
      message:
        status === 500
          ? 'An unexpected error occurred. Please try again.'
          : error.message,
    },
  });
};
