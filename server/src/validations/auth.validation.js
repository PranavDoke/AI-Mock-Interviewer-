const Joi = require('joi');

const register = {
  body: Joi.object().keys({
    name: Joi.string().required().min(2).max(100),
    email: Joi.string().required().email(),
    password: Joi.string()
      .required()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .message('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const updateProfile = {
  body: Joi.object()
    .keys({
      name: Joi.string().min(2).max(100),
      avatar: Joi.string().uri().allow(''),
      preferences: Joi.object().keys({
        preferredLanguage: Joi.string().valid('javascript', 'python', 'cpp', 'java', 'c'),
        preferredTopics: Joi.array().items(Joi.string()),
        interviewDuration: Joi.number().min(5).max(120),
      }),
    })
    .min(1),
};

const changePassword = {
  body: Joi.object().keys({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string()
      .required()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .message('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  }),
};

module.exports = {
  register,
  login,
  refreshTokens,
  updateProfile,
  changePassword,
};
