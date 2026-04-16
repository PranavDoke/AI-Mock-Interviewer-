const rateLimit = require('express-rate-limit');
const config = require('../config/config');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for auth endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for AI endpoints (respect provider limits)
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: {
    success: false,
    statusCode: 429,
    message: 'AI request rate limit exceeded. Please wait a moment.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for code execution
 */
const executionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    statusCode: 429,
    message: 'Code execution rate limit exceeded. Please wait.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, aiLimiter, executionLimiter };
