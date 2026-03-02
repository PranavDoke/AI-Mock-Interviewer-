const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const interviewRoutes = require('./interview.routes');
const executionRoutes = require('./execution.routes');
const analyticsRoutes = require('./analytics.routes');
const questionRoutes = require('./question.routes');

// API route mapping
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/interviews', interviewRoutes);
router.use('/execution', executionRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/questions', questionRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Mock Interviewer API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

module.exports = router;
