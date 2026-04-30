/**
 * Rule-based feedback generator
 */

const generateFeedback = ({ features = {}, score = 0 }) => {
  const feedback = [];
  const strengths = [];
  const weaknesses = [];

  const { testPassRate = 0, executionTime = null, codeLength = 0, complexityScore = 50, errorCount = 0 } = features;

  // Correctness-first
  if (testPassRate < 50) {
    feedback.push('Your solution fails most test cases. Focus on correctness and edge cases.');
    weaknesses.push('Low test pass rate');
  } else if (testPassRate < 80) {
    feedback.push('Your solution passes some tests but misses edge cases. Improve correctness.');
    weaknesses.push('Partial correctness');
  } else {
    strengths.push('Correctness: passes most test cases');
  }

  // Performance
  if (executionTime !== null) {
    if (executionTime > 1000) {
      feedback.push('Your solution works but is inefficient. Optimize time complexity.');
      weaknesses.push('Inefficient execution time');
    } else if (executionTime < 200) {
      strengths.push('Good execution speed');
    }
  }

  // Code quality
  if (codeLength > 300 || complexityScore > 70) {
    feedback.push('Consider refactoring for readability and reducing complexity.');
    weaknesses.push('High complexity / long code');
  } else {
    strengths.push('Readable and concise code');
  }

  // Overall
  if (score >= 80) {
    feedback.unshift('Good job! Your solution is correct and efficient.');
  } else if (score < 50) {
    feedback.unshift('Needs improvement: focus on passing tests and fixing runtime errors.');
  }

  // Deduplicate and limit
  const uniq = (arr) => Array.from(new Set(arr)).slice(0, 5);

  return {
    score,
    feedback: feedback.join(' '),
    strengths: uniq(strengths),
    weaknesses: uniq(weaknesses),
  };
};

module.exports = { generateFeedback };
