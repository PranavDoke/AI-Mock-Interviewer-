const express = require('express');
const router = express.Router();
const executionController = require('../controllers/execution.controller');
const validate = require('../middlewares/validate');
const executionValidation = require('../validations/execution.validation');
const { auth } = require('../middlewares/auth');
const { executionLimiter } = require('../middlewares/rateLimiter');

router.use(auth); // All execution routes require authentication

router.post('/run', executionLimiter, validate(executionValidation.executeCode), executionController.executeCode);
router.get('/runtimes', executionController.getRuntimes);
router.get('/health', executionController.healthCheck);

module.exports = router;
