const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interview.controller');
const validate = require('../middlewares/validate');
const interviewValidation = require('../validations/interview.validation');
const { auth } = require('../middlewares/auth');
const { aiLimiter } = require('../middlewares/rateLimiter');

router.use(auth); // All interview routes require authentication

// Session management
router.post('/sessions', aiLimiter, validate(interviewValidation.startSession), interviewController.startSession);
router.get('/sessions', validate(interviewValidation.listSessions), interviewController.listSessions);
router.get('/sessions/:sessionId', validate(interviewValidation.getSession), interviewController.getSession);
router.post('/sessions/:sessionId/abandon', validate(interviewValidation.getSession), interviewController.abandonSession);

// Question flow
router.get('/sessions/:sessionId/next-question', validate(interviewValidation.getSession), interviewController.getNextQuestion);
router.post('/sessions/:sessionId/submit', aiLimiter, validate(interviewValidation.submitAnswer), interviewController.submitAnswer);

module.exports = router;
