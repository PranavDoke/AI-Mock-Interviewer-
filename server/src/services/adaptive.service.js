const { Question } = require('../models');
const { clamp, randomInt } = require('../utils/helpers');
const logger = require('../config/logger');

/**
 * Adaptive Difficulty Engine
 *
 * Algorithm: Threshold-based with weighted performance tracking.
 *
 * How it works:
 * 1. Start at the user's current skill level for the selected topic(s).
 * 2. After each answer:
 *    - If score >= 70%: increase difficulty by 0.5 (up to 5)
 *    - If score < 40%: decrease difficulty by 0.5 (down to 1)
 *    - Otherwise: stay at current difficulty
 * 3. Topic selection prioritizes weakest topics to build balanced skills.
 * 4. Question selection avoids recently asked questions.
 */

/**
 * Calculate initial difficulty for a session based on user's skill profile.
 *
 * @param {Object} skillProfile - User's skill profile from DB
 * @param {string[]} topics - Topics selected for the session
 * @returns {number} Initial difficulty level (1-5)
 */
const calculateInitialDifficulty = (skillProfile, topics) => {
  if (!topics || topics.length === 0) {
    return Math.round(skillProfile.overall) || 3;
  }

  // Average skill level across selected topics
  let totalLevel = 0;
  let count = 0;

  topics.forEach((topic) => {
    const topicData = skillProfile.topics?.get?.(topic);
    if (topicData) {
      totalLevel += topicData.level;
      count += 1;
    }
  });

  if (count === 0) return 3; // Default for new topics
  return clamp(Math.round(totalLevel / count), 1, 5);
};

/**
 * Calculate next difficulty based on session performance so far.
 *
 * @param {Object} session - Current interview session
 * @returns {number} Next difficulty level (1-5)
 */
const calculateNextDifficulty = (session) => {
  const progression = session.difficultyProgression;

  if (progression.length === 0) {
    return session.config.targetDifficulty || 3;
  }

  const lastAttempt = progression[progression.length - 1];
  let nextDifficulty = lastAttempt.difficulty;

  // Enhanced threshold-based adjustment with weighted scoring
  if (lastAttempt.score >= 80) {
    // Excellent performance → significant difficulty increase
    nextDifficulty += 1;
  } else if (lastAttempt.score >= 70) {
    // Good performance → increase difficulty
    nextDifficulty += 0.5;
  } else if (lastAttempt.score >= 50) {
    // Average performance → keep difficulty stable
    nextDifficulty += 0;
  } else if (lastAttempt.score >= 30) {
    // Poor performance → decrease difficulty
    nextDifficulty -= 0.5;
  } else {
    // Very poor performance → significant decrease
    nextDifficulty -= 1;
  }

  // Consider recent trend (last 3 attempts) with heavier weight
  if (progression.length >= 3) {
    const recentScores = progression.slice(-3).map((p) => p.score);
    const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const trend = recentScores.length > 1 ? recentScores[recentScores.length - 1] - recentScores[0] : 0;

    if (avgRecent >= 85) {
      // Very strong trend → bigger difficulty jump
      nextDifficulty += 0.5;
    } else if (avgRecent >= 70 && trend > 0) {
      // Positive trend at good level → increase
      nextDifficulty += 0.25;
    } else if (avgRecent < 35) {
      // Struggling significantly → bigger drop
      nextDifficulty -= 0.5;
    } else if (avgRecent < 50 && trend < 0) {
      // Negative trend at low level → decrease
      nextDifficulty -= 0.25;
    }
  }

  return clamp(Math.round(nextDifficulty * 2) / 2, 1, 5); // Round to nearest 0.5
};

/**
 * Select the next topic to ask about, prioritizing weaker areas.
 *
 * @param {Object} skillProfile - User's skill profile
 * @param {string[]} allowedTopics - Session topics to choose from
 * @param {Object[]} progression - Questions already asked (with topics)
 * @returns {string} Selected topic
 */
const selectNextTopic = (skillProfile, allowedTopics, progression) => {
  if (!allowedTopics || allowedTopics.length === 0) {
    // Default technical topics
    allowedTopics = ['arrays', 'strings', 'trees', 'dynamic-programming', 'sorting'];
  }

  // Count how many times each topic was already asked
  const topicCounts = {};
  allowedTopics.forEach((t) => (topicCounts[t] = 0));
  progression.forEach((p) => {
    if (topicCounts[p.topic] !== undefined) topicCounts[p.topic] += 1;
  });

  // Score each topic: lower skill + fewer recent questions = higher priority
  const topicScores = allowedTopics.map((topic) => {
    const topicData = skillProfile.topics?.get?.(topic);
    const skillLevel = topicData ? topicData.level : 3;
    const timesAsked = topicCounts[topic] || 0;

    // Lower skill = higher priority, fewer questions = higher priority
    const priority = (6 - skillLevel) * 2 + (3 - Math.min(timesAsked, 3));
    return { topic, priority };
  });

  // Sort by priority (highest first) and add some randomness
  topicScores.sort((a, b) => b.priority - a.priority);

  // Pick from top 3 with weighted randomness
  const topCandidates = topicScores.slice(0, Math.min(3, topicScores.length));
  const totalPriority = topCandidates.reduce((sum, t) => sum + t.priority, 0);

  if (totalPriority <= 0) {
    return topCandidates[randomInt(0, topCandidates.length - 1)].topic;
  }

  let random = Math.random() * totalPriority;
  for (const candidate of topCandidates) {
    random -= candidate.priority;
    if (random <= 0) return candidate.topic;
  }

  return topCandidates[0].topic;
};

/**
 * Select the next question for the session.
 *
 * @param {Object} session - Current interview session
 * @param {Object} skillProfile - User's skill profile
 * @param {string[]} previousQuestionIds - IDs of already-asked questions
 * @returns {Object|null} Next question document, or null if none available
 */
const selectNextQuestion = async (session, skillProfile, previousQuestionIds) => {
  const difficulty = calculateNextDifficulty(session);
  const topic = selectNextTopic(
    skillProfile,
    session.config.topics,
    session.difficultyProgression
  );

  logger.debug(`Adaptive engine: selecting difficulty=${difficulty}, topic=${topic}`);

  // Try to find a question matching exact difficulty
  let question = await Question.findOne({
    topic,
    difficulty: Math.round(difficulty),
    isActive: true,
    type: session.config.type === 'mixed' ? { $in: ['coding', 'conceptual'] } : session.config.type,
    _id: { $nin: previousQuestionIds },
  });

  // Fallback: broaden difficulty range by ±1
  if (!question) {
    question = await Question.findOne({
      topic,
      difficulty: { $gte: Math.max(1, Math.round(difficulty) - 1), $lte: Math.min(5, Math.round(difficulty) + 1) },
      isActive: true,
      _id: { $nin: previousQuestionIds },
    });
  }

  // Fallback: any topic at similar difficulty
  if (!question) {
    question = await Question.findOne({
      difficulty: { $gte: Math.max(1, Math.round(difficulty) - 1), $lte: Math.min(5, Math.round(difficulty) + 1) },
      isActive: true,
      _id: { $nin: previousQuestionIds },
    });
  }

  // Final fallback: any available question
  if (!question) {
    question = await Question.findOne({
      isActive: true,
      _id: { $nin: previousQuestionIds },
    });
  }

  return question;
};

module.exports = {
  calculateInitialDifficulty,
  calculateNextDifficulty,
  selectNextTopic,
  selectNextQuestion,
};
