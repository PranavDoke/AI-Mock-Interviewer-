const Joi = require('joi');

const executeCode = {
  body: Joi.object().keys({
    code: Joi.string().required().max(50000),
    language: Joi.string().required().valid('javascript', 'python', 'cpp', 'java', 'c'),
    input: Joi.string().allow('').max(10000).default(''),
  }),
};

module.exports = {
  executeCode,
};
