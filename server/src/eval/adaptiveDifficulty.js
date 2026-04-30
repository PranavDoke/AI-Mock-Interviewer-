/**
 * Adaptive difficulty selection logic
 * Simple mapping with smoothing over last N attempts
 */

const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

const mapScoreToDifficulty = (score) => {
  if (score > 80) return DIFFICULTY.HARD;
  if (score >= 50) return DIFFICULTY.MEDIUM;
  return DIFFICULTY.EASY;
};

/**
 * Smooth using last N scores (weights recent more)
 */
const decideNextDifficulty = (currentScore, lastNScores = []) => {
  const scores = [...lastNScores.slice(-3), currentScore];
  if (!scores.length) return DIFFICULTY.MEDIUM;
  const weights = scores.map((_, i) => i + 1);
  const weighted = scores.reduce((sum, s, i) => sum + s * weights[i], 0) / weights.reduce((a, b) => a + b, 0);
  return mapScoreToDifficulty(Math.round(weighted));
};

module.exports = { decideNextDifficulty, DIFFICULTY };
