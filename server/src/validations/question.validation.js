const Joi = require('joi');

const createQuestion = {
  body: Joi.object().keys({
    title: Joi.string().required().max(200),
    description: Joi.string().required().max(5000),
    topic: Joi.string().required().valid(
      'arrays', 'string', 'searching', 'stack', 'dp', 'graph',
      'heap', 'matrix', 'hashing', 'hash-tables', 'backtracking',
      'tree', 'design', 'binary-search', 'bit-manipulation',
      'greedy', 'intervals', 'linked-list', 'segment-tree',
      'sliding-window', 'two-pointers', 'math', 'sorting'
    ),
    difficulty: Joi.number().required().min(1).max(5),
    type: Joi.string().valid('coding', 'conceptual', 'behavioral', 'system-design').default('coding'),
    starterCode: Joi.object().pattern(Joi.string(), Joi.string()),
    testCases: Joi.array().items(
      Joi.object().keys({
        input: Joi.string().required(),
        expectedOutput: Joi.string().required(),
        comparisonMode: Joi.string().valid('exact', 'unorderedDeep', 'longestPalindrome', 'nQueens', 'treeArray').default('exact'),
        isHidden: Joi.boolean().default(false),
        explanation: Joi.string(),
      })
    ),
    constraints: Joi.array().items(Joi.string()),
    hints: Joi.array().items(Joi.string()),
    solutionApproach: Joi.string(),
    timeComplexity: Joi.string(),
    spaceComplexity: Joi.string(),
    referenceUrls: Joi.array().items(Joi.string().uri()),
    testHarness: Joi.string().valid('function', 'tree', 'graph-clone', 'operations', 'codec', 'linked-list').default('function'),
    canonicalSolutions: Joi.object().pattern(Joi.string(), Joi.string()),
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

const topicAvailability = {
  query: Joi.object().keys({
    type: Joi.string().valid('coding', 'conceptual', 'behavioral', 'system-design').default('coding'),
  }),
};

module.exports = {
  createQuestion,
  listQuestions,
  topicAvailability,
};
