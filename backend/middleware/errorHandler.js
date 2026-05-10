/**
 * middleware/errorHandler.js — Global error handling middleware
 */

import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';

  // PostgreSQL unique violation
  if (err.code === '23505') {
    statusCode = 409;
    const field = err.detail?.match(/\(([^)]+)\)/)?.[1] || 'field';
    message = `${field} already exists.`;
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced record does not exist.';
  }

  // PostgreSQL check constraint
  if (err.code === '23514') {
    statusCode = 400;
    message = 'Data violates a database constraint.';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError')  { statusCode = 401; message = 'Invalid token.'; }
  if (err.name === 'TokenExpiredError')  { statusCode = 401; message = 'Token expired.'; }

  // Log non-operational errors (bugs)
  if (!err.isOperational) {
    logger.error(`[UNHANDLED ERROR] ${err.stack}`);
  }

  res.status(statusCode).json({
    success: false,
    error:   message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
