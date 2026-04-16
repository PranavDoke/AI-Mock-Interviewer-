const config = require('../config/config');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

/**
 * Convert non-ApiError errors to ApiError.
 */
const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

/**
 * Global error handler — sends JSON error response.
 */
const errorHandler = (err, req, res, _next) => {
  let { statusCode, message } = err;

  // In production, don't leak internal error details
  if (config.env === 'production' && !err.isOperational) {
    statusCode = 500;
    message = 'Internal Server Error';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`, {
      stack: err.stack,
    });
  } else {
    logger.warn(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`);
  }

  const response = {
    success: false,
    statusCode,
    message,
    ...(config.env === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

module.exports = { errorConverter, errorHandler };
