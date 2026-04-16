const Joi = require('joi');

const getAnalytics = {
  query: Joi.object().keys({
    period: Joi.string().valid('7d', '30d', '90d', 'all').default('30d'),
  }),
};

const getTopicAnalytics = {
  query: Joi.object().keys({
    topic: Joi.string(),
    period: Joi.string().valid('7d', '30d', '90d', 'all').default('30d'),
  }),
};

module.exports = {
  getAnalytics,
  getTopicAnalytics,
};
