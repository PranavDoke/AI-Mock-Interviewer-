const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(5000),
    MONGODB_URI: Joi.string().required().description('MongoDB connection URI'),
    JWT_ACCESS_SECRET: Joi.string().required().description('JWT access token secret'),
    JWT_REFRESH_SECRET: Joi.string().required().description('JWT refresh token secret'),
    JWT_ACCESS_EXPIRATION: Joi.string().default('30m'),
    JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
    AI_PROVIDER: Joi.string().valid('groq', 'huggingface', 'ollama', 'mock').default('mock'),
    AI_API_KEY: Joi.string().allow('').default(''),
    AI_BASE_URL: Joi.string().default('https://api.groq.com/openai/v1'),
    AI_MODEL: Joi.string().default('llama-3.3-70b-versatile'),
    PISTON_URL: Joi.string().default('http://localhost:2000'),
    REDIS_URL: Joi.string().allow('').default(''),
    RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
    RATE_LIMIT_MAX: Joi.number().default(100),
    LOG_LEVEL: Joi.string().default('debug'),
  })
  .unknown();

const { value: envVars, error } = envSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URI,
    options: {},
  },
  jwt: {
    accessSecret: envVars.JWT_ACCESS_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    accessExpiration: envVars.JWT_ACCESS_EXPIRATION,
    refreshExpiration: envVars.JWT_REFRESH_EXPIRATION,
  },
  ai: {
    provider: envVars.AI_PROVIDER,
    apiKey: envVars.AI_API_KEY,
    baseUrl: envVars.AI_BASE_URL,
    model: envVars.AI_MODEL,
  },
  piston: {
    url: envVars.PISTON_URL,
  },
  redis: {
    url: envVars.REDIS_URL,
  },
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    max: envVars.RATE_LIMIT_MAX,
  },
  logLevel: envVars.LOG_LEVEL,
};
