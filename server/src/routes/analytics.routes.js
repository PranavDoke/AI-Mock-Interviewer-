const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const validate = require('../middlewares/validate');
const analyticsValidation = require('../validations/analytics.validation');
const { auth } = require('../middlewares/auth');

router.use(auth); // All analytics routes require authentication

router.get('/dashboard', validate(analyticsValidation.getAnalytics), analyticsController.getDashboard);
router.get('/topics', validate(analyticsValidation.getTopicAnalytics), analyticsController.getTopicAnalytics);

module.exports = router;
