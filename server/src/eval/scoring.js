/**
 * Scoring module: deterministic weighted scoring
 * score = testPassRate * 0.7 + efficiencyScore * 0.2 + codeQualityScore * 0.1
 */

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

/**
 * Compute efficiency score based on execution time (ms).
 * Uses a simple min-max normalization with defaults per-language can be extended.
 */
const efficiencyScoreFromTime = (executionTimeMs) => {
  if (executionTimeMs === null || executionTimeMs === undefined) return 50; // unknown => neutral
  // Expect small problems to run under 100ms; bigger ones up to 2000ms
  const min = 10;
  const max = 2000;
  const norm = 1 - (Math.min(Math.max(executionTimeMs, min), max) - min) / (max - min);
  return Math.round(norm * 100);
};

/**
 * Code quality score derived from code length and complexity.
 */
const codeQualityScoreFrom = ({ codeLength = 0, complexityScore = 50 }) => {
  // Shorter concise code and lower complexity => higher score
  const lengthScore = codeLength <= 50 ? 100 : Math.max(20, Math.round(100 - ((codeLength - 50) / 5)));
  const quality = Math.round((lengthScore * 0.6) + ((100 - complexityScore) * 0.4));
  return clamp(quality);
};

const computeScore = ({ testPassRate = 0, executionTime = null, codeLength = 0, complexityScore = 50, errorCount = 0 }) => {
  const test = clamp(testPassRate);
  const efficiency = efficiencyScoreFromTime(executionTime);
  const codeQuality = codeQualityScoreFrom({ codeLength, complexityScore });

  const raw = (test * 0.7) + (efficiency * 0.2) + (codeQuality * 0.1);
  // penalize errors slightly
  const penalized = raw - (errorCount * 2);
  const finalScore = Math.round(clamp(penalized, 0, 100));

  return {
    overallScore: finalScore,
    components: {
      testPassRate: test,
      efficiencyScore: efficiency,
      codeQualityScore: codeQuality,
    },
  };
};

module.exports = { computeScore, efficiencyScoreFromTime, codeQualityScoreFrom };
