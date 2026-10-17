export function errorHandler(error, _req, res, _next) {
  const status = error.status || (error.name === 'ValidationError' ? 422 : 500);
  if (status === 500) console.error('Request failed:', error.message);
  res
    .status(status)
    .json({
      error: {
        message:
          status === 500
            ? 'An unexpected error occurred. Please try again.'
            : error.message,
      },
    });
}
