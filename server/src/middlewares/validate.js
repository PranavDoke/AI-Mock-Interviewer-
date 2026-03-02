const Joi = require('joi');
const ApiError = require('../utils/ApiError');
const { pick } = require('../utils/helpers');

/**
 * Express middleware that validates request data against a Joi schema.
 * Validates req.params, req.query, and req.body.
 *
 * @param {Object} schema - Joi validation schema with keys: params, query, body
 */
const validate = (schema) => (req, res, next) => {
  const validSchema = pick(schema, ['params', 'query', 'body']);
  const object = pick(req, Object.keys(validSchema));

  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    return next(new ApiError(400, errorMessage));
  }

  Object.assign(req, value);
  return next();
};

module.exports = validate;
