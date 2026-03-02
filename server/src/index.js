const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const connectDB = require('./config/database');
const { questionService } = require('./services');

let server;

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Seed initial questions if database is empty
  try {
    const result = await questionService.seedQuestions();
    if (result.seeded) {
      logger.info(`Seeded ${result.count} initial questions into database.`);
    }
  } catch (err) {
    logger.warn(`Question seeding skipped: ${err.message}`);
  }

  // Start Express server
  server = app.listen(config.port, () => {
    logger.info(`
    ================================================
     AI Mock Interviewer API
     Environment: ${config.env}
     Port: ${config.port}
     AI Provider: ${config.ai.provider}
     API: http://localhost:${config.port}/api/v1/health
    ================================================
    `);
  });
};

// Graceful shutdown
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error('Unexpected error:', error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);
process.on('SIGTERM', () => {
  logger.info('SIGTERM received.');
  exitHandler();
});
process.on('SIGINT', () => {
  logger.info('SIGINT received.');
  exitHandler();
});

startServer();
