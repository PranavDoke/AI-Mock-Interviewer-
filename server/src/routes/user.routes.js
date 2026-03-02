const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const validate = require('../middlewares/validate');
const authValidation = require('../validations/auth.validation');
const { auth } = require('../middlewares/auth');

router.use(auth); // All user routes require authentication

router.get('/profile', userController.getProfile);
router.patch('/profile', validate(authValidation.updateProfile), userController.updateProfile);
router.get('/skills', userController.getSkillProfile);

module.exports = router;
