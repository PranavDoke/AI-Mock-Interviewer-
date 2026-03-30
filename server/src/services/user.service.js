const { User } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Get user by ID.
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }
  return user;
};

/**
 * Update user profile.
 */
const updateProfile = async (userId, updateData) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }
  return user;
};

/**
 * Update user skill profile after a question attempt.
 */
const updateSkillProfile = async (userId, topic, score, timeSpentMs) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const topicData = user.skillProfile.topics.get(topic) || {
    level: 3,
    questionsAttempted: 0,
    correctAnswers: 0,
    avgTimeMs: 0,
  };

  topicData.questionsAttempted += 1;
  if (score >= 60) topicData.correctAnswers += 1;

  // Update rolling average time
  topicData.avgTimeMs = Math.round(
    (topicData.avgTimeMs * (topicData.questionsAttempted - 1) + timeSpentMs) /
      topicData.questionsAttempted
  );

  // Update topic skill level (threshold-based)
  const accuracy = topicData.correctAnswers / topicData.questionsAttempted;
  if (accuracy > 0.7 && topicData.level < 5) {
    topicData.level = Math.min(5, topicData.level + 0.3);
  } else if (accuracy < 0.4 && topicData.level > 1) {
    topicData.level = Math.max(1, topicData.level - 0.3);
  }
  topicData.level = Math.round(topicData.level * 10) / 10;

  user.skillProfile.topics.set(topic, topicData);

  // Recalculate overall skill
  let totalLevel = 0;
  let topicCount = 0;
  for (const [, data] of user.skillProfile.topics) {
    totalLevel += data.level;
    topicCount += 1;
  }
  user.skillProfile.overall = topicCount > 0
    ? Math.round((totalLevel / topicCount) * 10) / 10
    : 3;

  await user.save();
  return user;
};

/**
 * Update user interview stats.
 */
const updateStats = async (userId, sessionScore, questionsAnswered = 0) => {
  const user = await User.findById(userId);
  if (!user) return;

  const previousLastInterviewAt = user.stats.lastInterviewAt;
  const now = new Date();

  user.stats.totalInterviews += 1;
  user.stats.totalQuestions += Math.max(0, questionsAnswered || 0);
  user.stats.avgScore = Math.round(
    (user.stats.avgScore * (user.stats.totalInterviews - 1) + sessionScore) /
      user.stats.totalInterviews
  );

  // Streak tracking
  if (previousLastInterviewAt) {
    const daysDiff = Math.floor((now - previousLastInterviewAt) / (1000 * 60 * 60 * 24));
    if (daysDiff === 1) {
      user.stats.streak += 1;
    } else if (daysDiff > 1) {
      user.stats.streak = 1;
    }
  } else {
    user.stats.streak = 1;
  }

  user.stats.lastInterviewAt = now;
  user.stats.longestStreak = Math.max(user.stats.longestStreak, user.stats.streak);

  await user.save();
  return user;
};

module.exports = {
  getUserById,
  updateProfile,
  updateSkillProfile,
  updateStats,
};
