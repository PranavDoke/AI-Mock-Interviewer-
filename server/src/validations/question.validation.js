const Joi = require('joi');

const createQuestion = {
  body: Joi.object().keys({
    title: Joi.string().required().max(200),
    description: Joi.string().required().max(5000),
    topic: Joi.string().required().valid(
      'arrays', 'strings', 'linked-lists', 'trees', 'graphs',
      'dynamic-programming', 'sorting', 'searching', 'recursion',
      'stacks-queues', 'hash-tables', 'greedy', 'backtracking',
      'bit-manipulation', 'math', 'system-design', 'oop',
      'databases', 'networking', 'os-concepts'
    ),
    difficulty: Joi.number().required().min(1).max(5),
    type: Joi.string().valid('coding', 'conceptual', 'behavioral', 'system-design').default('coding'),
    starterCode: Joi.object().pattern(Joi.string(), Joi.string()),
    testCases: Joi.array().items(
      Joi.object().keys({
        input: Joi.string().required(),
        expectedOutput: Joi.string().required(),
        isHidden: Joi.boolean().default(false),
        explanation: Joi.string(),
      })
    ),
    constraints: Joi.array().items(Joi.string()),
    hints: Joi.array().items(Joi.string()),
    solutionApproach: Joi.string(),
    timeComplexity: Joi.string(),
    spaceComplexity: Joi.string(),
    expectedKeyPoints: Joi.array().items(Joi.string()),
    tags: Joi.array().items(Joi.string()),
    estimatedTimeMinutes: Joi.number().min(1).max(120).default(15),
  }),
};

const listQuestions = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    topic: Joi.string(),
    difficulty: Joi.number().integer().min(1).max(5),
    type: Joi.string().valid('coding', 'conceptual', 'behavioral', 'system-design'),
    search: Joi.string().max(200),
  }),
};

module.exports = {
  createQuestion,
  listQuestions,
};
