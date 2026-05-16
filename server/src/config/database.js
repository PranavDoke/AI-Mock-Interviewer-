const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info(`MongoDB connected: ${conn.connection.host}`);

    // Drop and recreate unique index on email to ensure it exists and is properly configured
    try {
      const collection = mongoose.connection.collection('users');
      await collection.dropIndex('email_1').catch(() => {
        // Index doesn't exist, which is fine
      });
      await collection.createIndex({ email: 1 }, { unique: true, sparse: true });
      logger.info('Email index created successfully');
    } catch (indexError) {
      logger.warn(`Index creation warning: ${indexError.message}`);
    }
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB error: ${err.message}`);
});

module.exports = connectDB;
