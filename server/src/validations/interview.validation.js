const Joi = require('joi');

const startSession = {
  body: Joi.object().keys({
    type: Joi.string().valid('technical', 'behavioral', 'system-design', 'mixed').default('technical'),
    topics: Joi.array().items(Joi.string()).min(1),
    language: Joi.string().valid('javascript', 'python', 'cpp', 'java', 'c').default('javascript'),
    maxQuestions: Joi.number().integer().min(1).max(20).default(5),
    timeLimitMinutes: Joi.number().integer().min(5).max(120).default(30),
  }),
};

const submitAnswer = {
  params: Joi.object().keys({
    sessionId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: Joi.object().keys({
    questionId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    code: Joi.string().allow('').max(50000),
    language: Joi.string().valid('javascript', 'python', 'cpp', 'java', 'c'),
    explanation: Joi.string().allow('').max(10000),
    timeSpentMs: Joi.number().integer().min(0).max(8 * 60 * 60 * 1000).default(0),
  }),
};

const getSession = {
  params: Joi.object().keys({
    sessionId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
  }),
};

const listSessions = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    status: Joi.string().valid('active', 'completed', 'abandoned'),
    sortBy: Joi.string().valid('createdAt', 'scores.overall').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

module.exports = {
  startSession,
  submitAnswer,
  getSession,
  listSessions,
};
