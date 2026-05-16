const { Question } = require('../models');
const ApiError = require('../utils/ApiError');
const aiService = require('./ai.service');
const { QUESTION_ENRICHMENT } = require('../data/question-enrichment');

/**
 * Pre-built seed questions for initial database population.
 */
/**
 * Create a new question manually.
 */
const createQuestion = async (questionData) => {
  const question = await Question.create(questionData);
  return question;
};

/**
 * Get question by ID.
 */
const getQuestionById = async (questionId) => {
  const question = await Question.findById(questionId);
  if (!question) {
    throw new ApiError(404, 'Question not found.');
  }
  return question;
};

/**
 * List questions with filtering and pagination.
 */
const QUESTION_SOURCE = 'leetcode-style';

const buildSeedQuestions = () => {
  const seedData = require('../data/seed-new-questions.json');
  return seedData.map((question) => {
    const enrichment = QUESTION_ENRICHMENT[question.title] || {};
    return {
      ...question,
      ...enrichment,
      source: QUESTION_SOURCE,
      isActive: true,
      tags: Array.from(new Set(['dsa', question.topic, ...(question.tags || [])])),
      testCases: enrichment.testCases || question.testCases,
      referenceUrls: enrichment.referenceUrls || question.referenceUrls || [],
      testHarness: enrichment.testHarness || 'function',
    };
  });
};

const listQuestions = async ({ page = 1, limit = 20, topic, difficulty, type, search }) => {
  const filter = { isActive: true, source: QUESTION_SOURCE };

  if (topic) filter.topic = topic;
  if (difficulty) filter.difficulty = parseInt(difficulty, 10);
  if (type) filter.type = type;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [questions, total] = await Promise.all([
    Question.find(filter)
      .sort({ difficulty: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Question.countDocuments(filter),
  ]);

  return { questions, total, page, limit };
};

/**
 * Get active question availability count per topic.
 * Only show questions from the leetcode-style collection.
 */
const getTopicAvailability = async ({ type = 'coding' } = {}) => {
  const topicEnum = Question.schema.path('topic').enumValues;
  const filter = { isActive: true, source: QUESTION_SOURCE };

  if (type) {
    filter.type = type;
  }

  const counts = await Question.aggregate([
    { $match: filter },
    { $group: { _id: '$topic', count: { $sum: 1 } } },
  ]);

  const byTopic = {};
  topicEnum.forEach((topic) => {
    byTopic[topic] = 0;
  });

  counts.forEach((item) => {
    byTopic[item._id] = item.count;
  });

  return {
    byTopic,
    total: Object.values(byTopic).reduce((sum, value) => sum + value, 0),
    type,
  };
};

/**
 * Generate a question using AI and save it.
 */
const generateAndSaveQuestion = async (topic, difficulty, type = 'coding') => {
  const questionData = await aiService.generateQuestion(topic, difficulty, type);

  const question = await Question.create({
    ...questionData,
    source: 'ai-generated',
    isActive: true,
  });

  return question;
};

/**
 * Seed database with initial questions.
 */
const seedQuestions = async () => {
  const seedData = buildSeedQuestions();

  const [existingSeedCount, importedCount] = await Promise.all([
    Question.countDocuments({ source: QUESTION_SOURCE }),
    Question.countDocuments({ source: 'imported' }),
  ]);

  if (importedCount > 0) {
    await Question.deleteMany({ source: 'imported' });
  }

  if (existingSeedCount > 0) {
    return { seeded: false, count: existingSeedCount };
  }

  const questions = await Question.insertMany(seedData);
  return { seeded: true, count: questions.length };
};

module.exports = {
  createQuestion,
  getQuestionById,
  listQuestions,
  getTopicAvailability,
  generateAndSaveQuestion,
  seedQuestions,
};
