const { InterviewSession } = require('../models');
const logger = require('../config/logger');

/**
 * Analytics Engine
 *
 * Provides performance tracking using MongoDB aggregation:
 * - Overall accuracy
 * - Topic-wise weakness analysis
 * - Time per question trends
 * - Difficulty progression
 * - Improvement over time
 * - Activity heatmap
 */

/**
 * Get comprehensive dashboard analytics for a user.
 */
const getDashboardAnalytics = async (userId, period = '30d') => {
  const dateFilter = getDateFilter(period);

  const [
    overallStats,
    topicBreakdown,
    difficultyProgression,
    recentPerformance,
    activityHeatmap,
    improvementTrend,
  ] = await Promise.all([
    getOverallStats(userId, dateFilter),
    getTopicBreakdown(userId, dateFilter),
    getDifficultyProgression(userId, dateFilter),
    getRecentPerformance(userId, 10),
    getActivityHeatmap(userId, dateFilter),
    getImprovementTrend(userId),
  ]);

  return {
    overall: overallStats,
    topics: topicBreakdown,
    difficultyProgression,
    recentPerformance,
    activityHeatmap,
    improvementTrend,
  };
};

/**
 * Overall performance stats.
 */
const getOverallStats = async (userId, dateFilter) => {
  const pipeline = [
    {
      $match: {
        userId: userId,
        status: 'completed',
        ...(dateFilter && { completedAt: dateFilter }),
      },
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        avgScore: { $avg: '$scores.overall' },
        avgAccuracy: { $avg: '$scores.accuracy' },
        totalQuestions: { $sum: { $size: '$submissions' } },
        avgTimePerQuestion: { $avg: '$scores.avgTimePerQuestion' },
        maxDifficulty: { $max: '$scores.difficultyHandled' },
        totalTimeMs: {
          $sum: {
            $subtract: ['$completedAt', '$startedAt'],
          },
        },
      },
    },
  ];

  const result = await InterviewSession.aggregate(pipeline);

  if (result.length === 0) {
    return {
      totalSessions: 0,
      avgScore: 0,
      avgAccuracy: 0,
      totalQuestions: 0,
      avgTimePerQuestion: 0,
      maxDifficulty: 0,
      totalTimeHours: 0,
    };
  }

  const stats = result[0];
  return {
    totalSessions: stats.totalSessions,
    avgScore: Math.round(stats.avgScore || 0),
    avgAccuracy: Math.round(stats.avgAccuracy || 0),
    totalQuestions: stats.totalQuestions,
    avgTimePerQuestion: Math.round(stats.avgTimePerQuestion || 0),
    maxDifficulty: stats.maxDifficulty || 0,
    totalTimeHours: Math.round((stats.totalTimeMs || 0) / 3600000 * 10) / 10,
  };
};

/**
 * Topic-wise performance breakdown.
 */
const getTopicBreakdown = async (userId, dateFilter) => {
  const pipeline = [
    {
      $match: {
        userId: userId,
        status: 'completed',
        ...(dateFilter && { completedAt: dateFilter }),
      },
    },
    { $unwind: '$difficultyProgression' },
    {
      $group: {
        _id: '$difficultyProgression.topic',
        avgScore: { $avg: '$difficultyProgression.score' },
        attempts: { $sum: 1 },
        avgDifficulty: { $avg: '$difficultyProgression.difficulty' },
        maxScore: { $max: '$difficultyProgression.score' },
        minScore: { $min: '$difficultyProgression.score' },
      },
    },
    { $sort: { avgScore: 1 } }, // Weakest topics first
  ];

  const result = await InterviewSession.aggregate(pipeline);

  return result.map((item) => ({
    topic: item._id,
    avgScore: Math.round(item.avgScore || 0),
    attempts: item.attempts,
    avgDifficulty: Math.round((item.avgDifficulty || 0) * 10) / 10,
    maxScore: Math.round(item.maxScore || 0),
    minScore: Math.round(item.minScore || 0),
    strength: item.avgScore >= 70 ? 'strong' : item.avgScore >= 50 ? 'moderate' : 'weak',
  }));
};

/**
 * Difficulty distribution — grouped by difficulty level (1–5).
 * Returns { _id: level, avgScore, count } for each difficulty level encountered.
 */
const getDifficultyProgression = async (userId, dateFilter) => {
  const pipeline = [
    {
      $match: {
        userId: userId,
        status: 'completed',
        ...(dateFilter && { completedAt: dateFilter }),
      },
    },
    { $unwind: '$difficultyProgression' },
    {
      $group: {
        _id: { $round: ['$difficultyProgression.difficulty', 0] },
        avgScore: { $avg: '$difficultyProgression.score' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const result = await InterviewSession.aggregate(pipeline);

  return result.map((item) => ({
    _id: item._id,
    avgScore: Math.round(item.avgScore || 0),
    count: item.count,
  }));
};

/**
 * Recent performance (last N sessions).
 */
const getRecentPerformance = async (userId, limit = 10) => {
  const sessions = await InterviewSession.find({
    userId,
    status: 'completed',
  })
    .sort({ completedAt: -1 })
    .limit(limit)
    .select('_id scores createdAt completedAt config submissions._id')
    .lean();

  return sessions;
};

/**
 * Activity heatmap (questions per day).
 */
const getActivityHeatmap = async (userId, dateFilter) => {
  const pipeline = [
    {
      $match: {
        userId: userId,
        status: 'completed',
        ...(dateFilter && { completedAt: dateFilter }),
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$completedAt' },
        },
        count: { $sum: 1 },
        avgScore: { $avg: '$scores.overall' },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const result = await InterviewSession.aggregate(pipeline);

  return result.map((item) => ({
    date: item._id,
    count: item.count,
    avgScore: Math.round(item.avgScore || 0),
  }));
};

/**
 * Improvement trend — compare recent vs older performance.
 */
const getImprovementTrend = async (userId) => {
  const allSessions = await InterviewSession.find({
    userId,
    status: 'completed',
  })
    .sort({ completedAt: 1 })
    .select('scores.overall completedAt');

  if (allSessions.length < 2) {
    return { trend: 'insufficient_data', improvement: 0 };
  }

  const midpoint = Math.floor(allSessions.length / 2);
  const firstHalf = allSessions.slice(0, midpoint);
  const secondHalf = allSessions.slice(midpoint);

  const avgFirst = firstHalf.reduce((sum, s) => sum + (s.scores?.overall || 0), 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, s) => sum + (s.scores?.overall || 0), 0) / secondHalf.length;

  const improvement = Math.round(avgSecond - avgFirst);

  return {
    trend: improvement > 5 ? 'improving' : improvement < -5 ? 'declining' : 'stable',
    improvement,
    avgFirstHalf: Math.round(avgFirst),
    avgSecondHalf: Math.round(avgSecond),
    // Aliases for frontend compatibility
    firstHalfAvg: Math.round(avgFirst),
    secondHalfAvg: Math.round(avgSecond),
  };
};

/**
 * Get topic-specific detailed analytics.
 */
const getTopicAnalytics = async (userId, topic, period = '30d') => {
  const dateFilter = getDateFilter(period);

  const pipeline = [
    {
      $match: {
        userId: userId,
        status: 'completed',
        ...(dateFilter && { completedAt: dateFilter }),
      },
    },
    { $unwind: '$difficultyProgression' },
    {
      $match: {
        'difficultyProgression.topic': topic,
      },
    },
    { $sort: { completedAt: 1 } },
    {
      $group: {
        _id: null,
        scores: { $push: '$difficultyProgression.score' },
        difficulties: { $push: '$difficultyProgression.difficulty' },
        dates: { $push: '$completedAt' },
        avgScore: { $avg: '$difficultyProgression.score' },
        count: { $sum: 1 },
      },
    },
  ];

  const result = await InterviewSession.aggregate(pipeline);

  if (result.length === 0) {
    return { topic, data: [] };
  }

  const data = result[0];
  return {
    topic,
    avgScore: Math.round(data.avgScore || 0),
    totalAttempts: data.count,
    progression: data.scores.map((score, i) => ({
      score: Math.round(score),
      difficulty: data.difficulties[i],
      date: data.dates[i],
    })),
  };
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function getDateFilter(period) {
  if (!period || period === 'all') return null;

  const days = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };

  const daysNum = days[period] || 30;
  const since = new Date();
  since.setDate(since.getDate() - daysNum);

  return { $gte: since };
}

module.exports = {
  getDashboardAnalytics,
  getOverallStats,
  getTopicBreakdown,
  getDifficultyProgression,
  getRecentPerformance,
  getActivityHeatmap,
  getImprovementTrend,
  getTopicAnalytics,
};
