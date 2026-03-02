const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const config = require('./config/config');
const morganMiddleware = require('./config/morgan');
const routes = require('./routes');
const { errorConverter, errorHandler } = require('./middlewares/error');
const { apiLimiter } = require('./middlewares/rateLimiter');
const ApiError = require('./utils/ApiError');

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.env === 'production'
      ? process.env.CLIENT_URL
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Gzip compression
app.use(compression());

// HTTP request logging
app.use(morganMiddleware);

// Rate limiting
if (config.env === 'production') {
  app.use('/api', apiLimiter);
}

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
});

// Error handling
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;
