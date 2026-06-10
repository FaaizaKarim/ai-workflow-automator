export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'ERROR');

  const response = {
    error: err.message || 'Internal server error',
    code,
  };

  if (process.env.NODE_ENV === 'development' && statusCode === 500 && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
