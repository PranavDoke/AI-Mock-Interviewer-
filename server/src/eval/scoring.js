/**
 * Scoring module: adaptive weighted scoring
 * Prioritizes correctness but amplifies quality when code is mostly/mostly correct
 * 
 * Formulas:
 * - testPassRate = 100: score = 100 (perfect, outputs are all correct)
 * - testPassRate >= 80: score = (test * 0.70) + (quality * 0.25) + (efficiency * 0.05) [reward good code]
 * - testPassRate >= 60: score = (test * 0.75) + (quality * 0.20) + (efficiency * 0.05) [some credit for quality]
 * - testPassRate < 60: score = (test * 0.80) + (quality * 0.15) + (efficiency * 0.05) [less quality weight]
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
const codeQualityScoreFrom = ({
  codeLength = 0,
  codeCharCount = 0,
  complexityScore = 50,
  implementationCompleteness = 0,
  hasMeaningfulCode = false,
  errorCount = 0,
}) => {
  if (!hasMeaningfulCode || implementationCompleteness <= 0) {
    return 0;
  }

  // Code structure: concise but readable code gets better structure score.
  const lengthBasis = codeCharCount > 0 ? codeCharCount : codeLength * 20;
  const avgLineLength = codeLength > 0 ? Math.round(lengthBasis / codeLength) : lengthBasis;
  const lengthScore = lengthBasis <= 120 ? 100 : Math.max(20, Math.round(100 - ((lengthBasis - 120) / 14)));
  const readabilityScore = avgLineLength <= 80 ? 100 : Math.max(30, Math.round(100 - ((avgLineLength - 80) * 1.5)));
  const structureScore = Math.round((lengthScore * 0.35) + (readabilityScore * 0.25) + ((100 - complexityScore) * 0.40));

  // Best practices: penalize syntax/runtime errors and extreme complexity.
  const bestPracticesScore = clamp(
    Math.round((100 - (errorCount * 12)) * 0.6 + (100 - complexityScore) * 0.4)
  );

  const completenessMultiplier = clamp(implementationCompleteness, 0, 100) / 100;
  const combinedQuality = Math.round((structureScore * 0.55) + (bestPracticesScore * 0.45));

  return clamp(Math.round(combinedQuality * completenessMultiplier));
};

const explanationScoreFrom = ({
  hasExplanation = false,
  explanationClarity = 0,
  reasoningDepth = 0,
  structuredThinking = 0,
  approachRelevance = 0,
  explanationCompleteness = 0,
}) => {
  if (!hasExplanation) return 0;

  return clamp(Math.round(
    (clamp(explanationClarity) * 0.25)
    + (clamp(reasoningDepth) * 0.25)
    + (clamp(structuredThinking) * 0.20)
    + (clamp(approachRelevance) * 0.20)
    + (clamp(explanationCompleteness) * 0.10)
  ));
};

const computeScore = ({ testPassRate = 0, executionTime = null, codeLength = 0, codeCharCount = 0, complexityScore = 50, errorCount = 0, implementationCompleteness = 0, hasMeaningfulCode = false }) => {
  const test = clamp(testPassRate);
  const efficiency = efficiencyScoreFromTime(executionTime);
  const codeQuality = codeQualityScoreFrom({
    codeLength,
    codeCharCount,
    complexityScore,
    implementationCompleteness,
    hasMeaningfulCode,
    errorCount,
  });

  let raw;
  
  // Adaptive formula: increase quality weight when correctness is high
  if (test === 100) {
    // Perfect: all output is correct → score = 100
    raw = 100;
  } else if (test >= 80) {
    // Very good correctness: reward quality more heavily
    // (test * 0.70) + (quality * 0.25) + (efficiency * 0.05)
    raw = (test * 0.70) + (codeQuality * 0.25) + (efficiency * 0.05);
  } else if (test >= 60) {
    // Decent correctness: some credit for quality
    // (test * 0.75) + (quality * 0.20) + (efficiency * 0.05)
    raw = (test * 0.75) + (codeQuality * 0.20) + (efficiency * 0.05);
  } else {
    // Low correctness: less credit for quality
    // (test * 0.80) + (quality * 0.15) + (efficiency * 0.05)
    raw = (test * 0.80) + (codeQuality * 0.15) + (efficiency * 0.05);
  }

  const errorPenalty = test === 0 ? 10 : errorCount * 2;
  const completenessPenalty = hasMeaningfulCode ? 0 : 15;
  const penalized = raw - errorPenalty - completenessPenalty;
  
  // Final score capped at 0-100
  const finalScore = Math.round(clamp(penalized, 0, 100));

  return {
    overallScore: finalScore,
    components: {
      testPassRate: test,
      efficiencyScore: efficiency,
      codeQualityScore: codeQuality,
      implementationCompleteness: clamp(implementationCompleteness),
    },
  };
};

module.exports = { computeScore, efficiencyScoreFromTime, codeQualityScoreFrom, explanationScoreFrom };
