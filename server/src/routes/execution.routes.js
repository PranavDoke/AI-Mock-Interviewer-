const express = require('express');
const router = express.Router();
const executionController = require('../controllers/execution.controller');
const validate = require('../middlewares/validate');
const executionValidation = require('../validations/execution.validation');
const { auth } = require('../middlewares/auth');
const { executionLimiter } = require('../middlewares/rateLimiter');

// Public endpoints (used by UI to detect runner availability)
router.get('/health', executionController.healthCheck);
router.get('/runtimes', executionController.getRuntimes);

// Protected endpoint (user-triggered code execution)
router.post(
	'/run',
	auth,
	executionLimiter,
	validate(executionValidation.executeCode),
	executionController.executeCode
);

module.exports = router;
