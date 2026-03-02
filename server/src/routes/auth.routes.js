const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const authValidation = require('../validations/auth.validation');
const { auth } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');

// Public routes
router.post('/register', authLimiter, validate(authValidation.register), authController.register);
router.post('/login', authLimiter, validate(authValidation.login), authController.login);
router.post('/refresh-tokens', validate(authValidation.refreshTokens), authController.refreshTokens);

// Protected routes
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.getMe);
router.post('/change-password', auth, validate(authValidation.changePassword), authController.changePassword);

module.exports = router;
