const express = require('express');
const router = express.Router();
const questionController = require('../controllers/question.controller');
const validate = require('../middlewares/validate');
const questionValidation = require('../validations/question.validation');
const { auth, authorize } = require('../middlewares/auth');

// Public: list and get questions (auth required)
router.get('/', auth, validate(questionValidation.listQuestions), questionController.listQuestions);
router.get('/topics/availability', auth, validate(questionValidation.topicAvailability), questionController.getTopicAvailability);
router.get('/:questionId', auth, questionController.getQuestion);

// Admin: create and manage questions
router.post('/', auth, authorize('admin'), validate(questionValidation.createQuestion), questionController.createQuestion);
router.post('/generate', auth, authorize('admin'), questionController.generateQuestion);
router.post('/seed', auth, authorize('admin'), questionController.seedQuestions);

module.exports = router;
