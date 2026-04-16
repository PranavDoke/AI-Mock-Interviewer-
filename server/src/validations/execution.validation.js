const Joi = require('joi');

const executeCode = {
  body: Joi.object().keys({
    code: Joi.string().required().max(50000),
    language: Joi.string().required().valid('javascript', 'python', 'cpp', 'java', 'c'),
    mode: Joi.string().valid('stdin', 'testCases').default('stdin'),
    input: Joi.string().allow('').max(10000).default(''),
    testCases: Joi.array().items(
      Joi.object().keys({
        input: Joi.string().required().max(10000),
        expectedOutput: Joi.string().required().max(65536),
        isHidden: Joi.boolean().default(false),
      })
    ).min(1).default([]),
  }),
};

module.exports = {
  executeCode,
};
