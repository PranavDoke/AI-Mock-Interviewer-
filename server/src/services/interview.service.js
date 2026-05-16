const { InterviewSession, Question, User } = require('../models');
const ApiError = require('../utils/ApiError');
const adaptiveEngine = require('./adaptive.service');
const aiService = require('./ai.service');
const questionService = require('./question.service');
const userService = require('./user.service');

const getAttemptedQuestionIds = async (userId) => {
  const sessions = await InterviewSession.find(
    { userId },
    { 'submissions.questionId': 1 }
  ).lean();

  const unique = new Set();
  sessions.forEach((session) => {
    (session.submissions || []).forEach((submission) => {
      if (submission.questionId) {
        unique.add(String(submission.questionId));
      }
    });
  });

  return Array.from(unique);
};

/**
 * Start a new interview session.
 */
const startSession = async (userId, sessionConfig) => {
  await questionService.seedQuestions();

  // Check for existing active session
  const activeSession = await InterviewSession.findOne({ userId, status: 'active' });
  if (activeSession) {
    throw new ApiError(400, 'You already have an active interview session. Complete or abandon it first.');
  }

  // Get user skill profile for adaptive difficulty
  const user = await User.findById(userId);
  const targetDifficulty = adaptiveEngine.calculateInitialDifficulty(user.skillProfile, sessionConfig.topics);

  const session = await InterviewSession.create({
    userId,
    config: {
      ...sessionConfig,
      targetDifficulty,
    },
    status: 'active',
    startedAt: new Date(),
  });

  // Get first question
  // Only exclude questions already in this session (which is empty for new sessions)
  const previousQuestionIds = session.submissions.map((s) => String(s.questionId));
  const firstQuestion = await adaptiveEngine.selectNextQuestion(
    session,
    user.skillProfile,
    previousQuestionIds
  );

  session.currentQuestionId = firstQuestion?._id || null;
  await session.save();

  return { session, currentQuestion: firstQuestion };
};

/**
 * Get the next question for an active session.
 */
const getNextQuestion = async (sessionId, userId) => {
  const session = await InterviewSession.findOne({ _id: sessionId, userId, status: 'active' });
  if (!session) {
    throw new ApiError(404, 'Active session not found.');
  }

  // Check if session is complete
  if (session.submissions.length >= session.config.maxQuestions) {
    return { completed: true, session };
  }

  const user = await User.findById(userId);
  const previousQuestionIds = session.submissions.map((s) => String(s.questionId));

  // Only exclude questions already in this session, allowing reuse across different sessions
  const nextQuestion = await adaptiveEngine.selectNextQuestion(
    session,
    user.skillProfile,
    previousQuestionIds
  );

  if (!nextQuestion) {
    return { completed: true, session, reason: 'topic_pool_exhausted' };
  }

  session.currentQuestionId = nextQuestion._id;
  session.currentQuestionIndex = session.submissions.length;
  await session.save();

  return {
    completed: false,
    question: nextQuestion,
    questionIndex: session.currentQuestionIndex,
    reason: null,
  };
};

/**
 * Submit an answer for the current question.
 */
const submitAnswer = async (sessionId, userId, answerData) => {
  const session = await InterviewSession.findOne({ _id: sessionId, userId, status: 'active' });
  if (!session) {
    throw new ApiError(404, 'Active session not found.');
  }

  const question = await Question.findById(answerData.questionId);
  if (!question) {
    throw new ApiError(404, 'Question not found.');
  }

  // Evaluate the answer using AI
  const evaluation = await aiService.evaluateAnswer({
    question,
    code: answerData.code,
    language: answerData.language || session.config.language,
    explanation: answerData.explanation,
  });

  // Build submission record
  const submission = {
    questionId: question._id,
    code: answerData.code || '',
    language: answerData.language || session.config.language,
    explanation: answerData.explanation || '',
    executionResult: {
      executionTimeMs: evaluation.avgExecutionTimeMs || 0,
      timedOut: (evaluation.testResults || []).some((t) => t.timedOut),
    },
    testResults: (evaluation.testResults || []).map((t) => ({
      input: t.input,
      expectedOutput: t.expectedOutput,
      actualOutput: t.actualOutput,
      passed: t.passed,
      executionTimeMs: t.executionTimeMs,
    })),
    evaluation,
    startedAt: answerData.startedAt || new Date(),
    submittedAt: new Date(),
    timeSpentMs: answerData.timeSpentMs || 0,
  };

  session.submissions.push(submission);

  // Track difficulty progression
  session.difficultyProgression.push({
    questionIndex: session.submissions.length - 1,
    difficulty: question.difficulty,
    topic: question.topic,
    score: evaluation.codeCorrectness,
  });

  // Update user skill profile
  await userService.updateSkillProfile(
    userId,
    question.topic,
    evaluation.codeCorrectness,
    submission.timeSpentMs
  );

  // Update question stats
  question.timesAsked += 1;
  question.avgAcceptanceRate = Math.round(
    (question.avgAcceptanceRate * (question.timesAsked - 1) +
      (evaluation.codeCorrectness >= 60 ? 100 : 0)) /
      question.timesAsked
  );
  await question.save();

  // Check if session is complete
  const isComplete = session.submissions.length >= session.config.maxQuestions;
  if (isComplete) {
    await completeSession(session, userId);
  } else {
    await session.save();
  }

  return {
    submission,
    evaluation,
    isComplete,
    questionsRemaining: session.config.maxQuestions - session.submissions.length,
  };
};

/**
 * Complete a session — calculate final scores and generate summary.
 */
const completeSession = async (session, userId) => {
  session.status = 'completed';
  session.completedAt = new Date();
  session.currentQuestionId = null;

  // Calculate session scores
  const submissions = session.submissions;
  const scores = submissions.map((s) => s.evaluation.overallScore);
  const totalScore = scores.reduce((a, b) => a + b, 0);

  session.scores.overall = Math.round(totalScore / scores.length);
  session.scores.accuracy = Math.round(
    (submissions.filter((s) => (s.evaluation?.codeCorrectness || 0) >= 60).length / submissions.length) * 100
  );
  session.scores.avgTimePerQuestion = Math.round(
    submissions.reduce((sum, s) => sum + s.timeSpentMs, 0) / submissions.length
  );

  // Calculate topic scores
  const topicScores = {};
  submissions.forEach((sub, idx) => {
    const topic = session.difficultyProgression[idx]?.topic;
    if (topic) {
      if (!topicScores[topic]) topicScores[topic] = [];
      topicScores[topic].push(sub.evaluation.overallScore);
    }
  });
  for (const [topic, topScores] of Object.entries(topicScores)) {
    session.scores.topicScores.set(
      topic,
      Math.round(topScores.reduce((a, b) => a + b, 0) / topScores.length)
    );
  }

  // Calculate difficulty handled
  const difficulties = session.difficultyProgression.map((d) => d.difficulty);
  session.scores.difficultyHandled = Math.max(...difficulties);

  // Generate AI summary
  try {
    session.summary = await aiService.generateSessionSummary(session);
  } catch (err) {
    session.summary = {
      overallFeedback: `You scored ${session.scores.overall}% overall.`,
      strengths: ['Completed the interview session'],
      weaknesses: [],
      recommendations: ['Continue practicing regularly'],
      nextSteps: ['Try harder difficulty questions'],
    };
  }

  await session.save();

  // Update user stats
  await userService.updateStats(userId, session.scores.overall);

  return session;
};

/**
 * Abandon an active session.
 */
const abandonSession = async (sessionId, userId) => {
  const session = await InterviewSession.findOneAndUpdate(
    { _id: sessionId, userId, status: 'active' },
    { status: 'abandoned', completedAt: new Date() },
    { new: true }
  );
  if (!session) {
    throw new ApiError(404, 'Active session not found.');
  }
  return session;
};

/**
 * Get session by ID.
 */
const getSession = async (sessionId, userId) => {
  const session = await InterviewSession.findOne({ _id: sessionId, userId })
    .populate('currentQuestionId', 'title description topic difficulty type starterCode testCases constraints hints solutionApproach complexityMetrics tags')
    .populate('submissions.questionId', 'title topic difficulty type');
  if (!session) {
    throw new ApiError(404, 'Session not found.');
  }
  // If an active session has no currentQuestion persisted, fetch and persist one
  if (session.status === 'active' && !session.currentQuestionId) {
    try {
      await getNextQuestion(sessionId, userId);
      // re-populate with the newly assigned currentQuestionId
      return InterviewSession.findOne({ _id: sessionId, userId })
        .populate('currentQuestionId', 'title description topic difficulty type starterCode testCases constraints hints solutionApproach complexityMetrics tags')
        .populate('submissions.questionId', 'title topic difficulty type');
    } catch (err) {
      // If fetching next question fails, return the original session so caller can handle
      return session;
    }
  }
  return session;
};

/**
 * List sessions for a user with pagination.
 */
const listSessions = async (userId, { page = 1, limit = 10, status, sortBy = 'createdAt', order = 'desc' }) => {
  const filter = { userId };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const sortOrder = order === 'desc' ? -1 : 1;

  const [sessions, total] = await Promise.all([
    InterviewSession.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .select('-submissions.code -submissions.explanation'),
    InterviewSession.countDocuments(filter),
  ]);

  return { sessions, total, page, limit };
};

module.exports = {
  startSession,
  getNextQuestion,
  submitAnswer,
  completeSession,
  abandonSession,
  getSession,
  listSessions,
};
