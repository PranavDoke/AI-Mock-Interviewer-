const { InterviewSession, Question, User } = require('../models');
const ApiError = require('../utils/ApiError');
const adaptiveEngine = require('./adaptive.service');
const aiService = require('./ai.service');
const userService = require('./user.service');
const executionService = require('./execution.service');

/**
 * Start a new interview session.
 */
const startSession = async (userId, sessionConfig) => {
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
  const firstQuestion = await adaptiveEngine.selectNextQuestion(
    session,
    user.skillProfile,
    []
  );

  return { session, currentQuestion: firstQuestion };
};

const getSessionDeadline = (session) => {
  const timeLimitMinutes = session?.config?.timeLimitMinutes || 30;
  return new Date(session.startedAt.getTime() + timeLimitMinutes * 60 * 1000);
};

const hasSessionExpired = (session) => {
  return Date.now() > getSessionDeadline(session).getTime();
};

const resolveQuestionStartedAt = (session) => {
  if (!session.submissions || session.submissions.length === 0) {
    return session.startedAt;
  }
  return session.submissions[session.submissions.length - 1].submittedAt || session.startedAt;
};

const normalizeTimeSpentMs = (providedTimeSpentMs, questionStartedAt) => {
  const elapsedMs = Math.max(0, Date.now() - questionStartedAt.getTime());
  const safeProvided = Number.isFinite(providedTimeSpentMs) ? Math.max(0, providedTimeSpentMs) : 0;
  if (safeProvided > elapsedMs + 5000) {
    throw new ApiError(400, 'Invalid timeSpentMs for this submission.');
  }
  return Math.min(safeProvided, elapsedMs);
};

const summarizeTestExecution = (testResults) => {
  if (!Array.isArray(testResults) || testResults.length === 0) {
    return null;
  }

  const failed = testResults.find((result) => !result.passed);
  const totalExecutionTimeMs = testResults.reduce((sum, result) => sum + (result.executionTimeMs || 0), 0);
  const timedOut = testResults.some((result) => result.timedOut);

  if (!failed) {
    return {
      stdout: 'All tests passed.',
      stderr: '',
      exitCode: 0,
      executionTimeMs: totalExecutionTimeMs,
      timedOut,
    };
  }

  return {
    stdout: failed.actualOutput || '',
    stderr: failed.stderr || failed.error || 'Execution failed on one or more tests.',
    exitCode: 1,
    executionTimeMs: totalExecutionTimeMs,
    timedOut,
  };
};

/**
 * Get the next question for an active session.
 */
const getNextQuestion = async (sessionId, userId) => {
  const session = await InterviewSession.findOne({ _id: sessionId, userId, status: 'active' });
  if (!session) {
    throw new ApiError(404, 'Active session not found.');
  }

  if (hasSessionExpired(session)) {
    await completeSession(session, userId);
    return { completed: true, session };
  }

  // Check if session is complete
  if (session.submissions.length >= session.config.maxQuestions) {
    return { completed: true, session };
  }

  const user = await User.findById(userId);
  const previousQuestionIds = session.submissions.map((s) => s.questionId);

  const nextQuestion = await adaptiveEngine.selectNextQuestion(
    session,
    user.skillProfile,
    previousQuestionIds
  );

  if (!nextQuestion) {
    return { completed: true, session };
  }

  session.currentQuestionIndex = session.submissions.length;
  await session.save();

  return { completed: false, question: nextQuestion, questionIndex: session.currentQuestionIndex };
};

/**
 * Submit an answer for the current question.
 */
const submitAnswer = async (sessionId, userId, answerData) => {
  const session = await InterviewSession.findOne({ _id: sessionId, userId, status: 'active' });
  if (!session) {
    throw new ApiError(404, 'Active session not found.');
  }

  if (hasSessionExpired(session)) {
    await completeSession(session, userId);
    throw new ApiError(400, 'Session time limit exceeded. Session has been auto-completed.');
  }

  const question = await Question.findById(answerData.questionId);
  if (!question) {
    throw new ApiError(404, 'Question not found.');
  }

  const questionStartedAt = resolveQuestionStartedAt(session);
  const normalizedTimeSpentMs = normalizeTimeSpentMs(answerData.timeSpentMs, questionStartedAt);

  const language = answerData.language || session.config.language;
  let testResults = [];
  let executionResult = null;

  if (question.type === 'coding' && answerData.code?.trim() && Array.isArray(question.testCases) && question.testCases.length > 0) {
    try {
      testResults = await executionService.runTestCases(answerData.code, language, question.testCases);
      executionResult = summarizeTestExecution(testResults);
    } catch (error) {
      testResults = [];
      executionResult = {
        stdout: '',
        stderr: `Automated test execution unavailable: ${error.message}`,
        exitCode: -1,
        executionTimeMs: 0,
        timedOut: false,
      };
    }
  }

  // Evaluate the answer using AI
  const evaluation = await aiService.evaluateAnswer({
    question,
    code: answerData.code,
    language,
    explanation: answerData.explanation,
    testResults,
  });

  // Build submission record
  const submission = {
    questionId: question._id,
    code: answerData.code || '',
    language,
    explanation: answerData.explanation || '',
    executionResult: executionResult || undefined,
    testResults,
    evaluation,
    startedAt: questionStartedAt,
    submittedAt: new Date(),
    timeSpentMs: normalizedTimeSpentMs,
  };

  session.submissions.push(submission);

  // Track difficulty progression
  session.difficultyProgression.push({
    questionIndex: session.submissions.length - 1,
    difficulty: question.difficulty,
    topic: question.topic,
    score: evaluation.overallScore,
  });

  // Update user skill profile
  await userService.updateSkillProfile(
    userId,
    question.topic,
    evaluation.overallScore,
    submission.timeSpentMs
  );

  // Update question stats
  question.timesAsked += 1;
  question.avgAcceptanceRate = Math.round(
    (question.avgAcceptanceRate * (question.timesAsked - 1) +
      (evaluation.overallScore >= 60 ? 100 : 0)) /
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

  const questionsRemaining = session.config.maxQuestions - session.submissions.length;

  return {
    submission,
    evaluation,
    isComplete,
    questionsRemaining,
    // Additional feedback for better UX
    userFeedback: evaluation.overallScore >= 70 ? 'Great work! Moving to the next question.' : 'Keep practicing. Try to improve on the weaker areas.',
  };
};

/**
 * Complete a session — calculate final scores and generate summary.
 */
const completeSession = async (session, userId) => {
  if (session.status === 'completed') {
    return session;
  }

  session.status = 'completed';
  session.completedAt = new Date();

  // Calculate session scores
  const submissions = session.submissions;

  if (!submissions.length) {
    session.scores.overall = 0;
    session.scores.accuracy = 0;
    session.scores.avgTimePerQuestion = 0;
    session.scores.difficultyHandled = 0;
    session.summary = {
      overallFeedback: 'Session ended before any answer was submitted.',
      strengths: [],
      weaknesses: ['No completed submissions'],
      recommendations: ['Start a new session and submit at least one solution.'],
      nextSteps: ['Try a shorter interview duration to build consistency.'],
    };
    await session.save();
    await userService.updateStats(userId, session.scores.overall, 0);
    return session;
  }

  const scores = submissions.map((s) => s.evaluation.overallScore);
  const totalScore = scores.reduce((a, b) => a + b, 0);

  session.scores.overall = Math.round(totalScore / scores.length);
  session.scores.accuracy = Math.round(
    (scores.filter((s) => s >= 60).length / scores.length) * 100
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
  await userService.updateStats(userId, session.scores.overall, submissions.length);

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
    .populate('submissions.questionId', 'title topic difficulty type');
  if (!session) {
    throw new ApiError(404, 'Session not found.');
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
