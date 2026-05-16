/**
 * Rule-based feedback generator — generates accurate, context-aware feedback
 * Emphasizes good performance when code is correct and has good quality
 */

const generateFeedback = ({ features = {}, score = 0 }) => {
  const feedback = [];
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  const {
    testPassRate = 0,
    executionTime = null,
    codeLength = 0,
    codeCharCount = 0,
    complexityScore = 50,
    errorCount = 0,
    implementationCompleteness = 0,
    hasMeaningfulCode = false,
    hasExplanation = false,
    explanationClarity = 0,
    reasoningDepth = 0,
    structuredThinking = 0,
    approachRelevance = 0,
    explanationCompleteness = 0,
  } = features;

  // === CORRECTNESS ANALYSIS (Primary) ===
  if (testPassRate === 100) {
    strengths.push('✓ Perfect! All test cases pass');
    strengths.push('Output is correct for all inputs');
    feedback.push('🌟 Excellent! Your solution is correct and produces the right output for all test cases.');
  } else if (testPassRate >= 90) {
    strengths.push(`✓ Almost perfect (${testPassRate}% pass rate)`);
    feedback.push(`Outstanding! Your solution passes ${testPassRate}% of test cases. Only minor edge cases remain.`);
  } else if (testPassRate >= 80) {
    strengths.push(`Very good correctness (${testPassRate}%)`);
    feedback.push(`Great work! Your solution passes ${testPassRate}% of tests. Fix a few edge cases for 100%.`);
  } else if (testPassRate >= 70) {
    strengths.push(`Good correctness (${testPassRate}%)`);
    feedback.push(`Good job! Your solution passes ${testPassRate}% of tests. Continue improving edge case handling.`);
  } else if (testPassRate >= 60) {
    weaknesses.push(`Partial correctness (${testPassRate}%)`);
    feedback.push(`Your solution passes ${testPassRate}% of tests. Review the failing cases and improve your algorithm.`);
  } else if (testPassRate > 0) {
    weaknesses.push(`Low correctness (${testPassRate}%)`);
    feedback.push(`Your solution only passes ${testPassRate}% of tests. Reconsider your approach.`);
  } else {
    weaknesses.push('No test cases pass');
    feedback.push('Your solution does not pass any test cases. Review the problem requirements and algorithm.');
  }

  // === CODE QUALITY ANALYSIS ===
  if (hasMeaningfulCode && implementationCompleteness >= 90) {
    strengths.push('Complete and well-implemented');
  }
  
  if (testPassRate >= 80 && hasMeaningfulCode && implementationCompleteness >= 80) {
    if (codeLength <= 200 && complexityScore <= 60) {
      strengths.push('Clean and efficient code');
      feedback.push('Your code is clean, readable, and efficient.');
    } else if (codeLength > 400) {
      weaknesses.push('Code could be more concise');
      feedback.push('Consider refactoring for better readability.');
    }
  }

  // === CODE IMPLEMENTATION STATUS ===
  if (!hasMeaningfulCode || implementationCompleteness <= 5) {
    weaknesses.push('Starter template only - incomplete implementation');
    feedback.push('You submitted only starter code. Implement the full solution.');
  } else if (implementationCompleteness < 50) {
    weaknesses.push('Implementation is incomplete');
    feedback.push('Your solution is incomplete. Add more logic to handle the problem.');
  } else if (implementationCompleteness < 80) {
    if (testPassRate < 60) {
      feedback.push('Implementation is incomplete or has logical issues.');
    }
  }

  // === EXPLANATION / APPROACH ANALYSIS ===
  if (hasExplanation) {
    if (approachRelevance >= 75 && reasoningDepth >= 70) {
      strengths.push('Explanation matches the expected approach');
      feedback.push('Your explanation connects well to the intended algorithm and reasoning.');
    } else if (approachRelevance >= 50) {
      strengths.push('Explanation covers part of the expected approach');
      recommendations.push('Make the reasoning more explicit and mention key edge cases.');
    } else {
      weaknesses.push('Explanation does not clearly match the expected approach');
      recommendations.push('Explain the core algorithm, why it works, and its time/space complexity.');
    }

    if (explanationClarity < 45 || structuredThinking < 45 || explanationCompleteness < 45) {
      weaknesses.push('Explanation needs clearer structure');
      feedback.push('Improve the explanation by describing the steps, edge cases, and complexity.');
    }
  }

  // === PERFORMANCE ANALYSIS (only if not perfect) ===
  if (hasMeaningfulCode && testPassRate > 0 && testPassRate < 100 && executionTime !== null) {
    if (executionTime > 1500) {
      weaknesses.push(`Very slow execution (${Math.round(executionTime)}ms)`);
      feedback.push(`Execution time is ${Math.round(executionTime)}ms. Optimize your algorithm.`);
    } else if (executionTime > 800) {
      weaknesses.push(`Slow execution (${Math.round(executionTime)}ms)`);
      feedback.push(`Execution time is ${Math.round(executionTime)}ms. Consider optimization.`);
    } else if (executionTime > 300) {
      feedback.push(`Execution time is ${Math.round(executionTime)}ms. Acceptable performance.`);
    } else {
      strengths.push('Very efficient execution');
    }
  }

  // === ERROR ANALYSIS ===
  if (errorCount > 2) {
    weaknesses.push(`Multiple runtime/syntax errors (${errorCount})`);
    feedback.push(`There are ${errorCount} errors in your code. Fix them.`);
  } else if (errorCount === 1) {
    weaknesses.push('Runtime or syntax error');
    feedback.push('There is an error in your code. Review and fix it.');
  }

  // === FINAL OVERALL VERDICT ===
  if (score >= 100) {
    feedback.unshift(`🌟 Perfect! Your solution is correct, efficient, and well-written. Score: ${Math.round(score)}/100 🌟`);
  } else if (score >= 95) {
    feedback.unshift(`🌟 Outstanding! Your solution is correct, efficient, and well-written. Score: ${Math.round(score)}/100`);
  } else if (score >= 90) {
    feedback.unshift(`⭐ Excellent work! Your solution is correct with good code quality. Score: ${Math.round(score)}/100`);
  } else if (score >= 85) {
    feedback.unshift(`✓ Excellent solution! Very good correctness and quality. Score: ${Math.round(score)}/100`);
  } else if (score >= 80) {
    feedback.unshift(`✓ Great solution! Good correctness and quality. Score: ${Math.round(score)}/100`);
  } else if (score >= 70) {
    feedback.unshift(`→ Good attempt. Room for improvement. Score: ${Math.round(score)}/100`);
  } else if (score >= 50) {
    feedback.unshift(`⚠ Needs improvement. Focus on correctness. Score: ${Math.round(score)}/100`);
  } else {
    feedback.unshift(`✗ Significant work needed. Score: ${Math.round(score)}/100`);
  }

  // === ACTIONABLE RECOMMENDATIONS ===
  if (testPassRate === 100 && score >= 90) {
    recommendations.push('Congratulations! Your solution is excellent.');
    recommendations.push('Try a harder difficulty level for more challenges.');
  } else if (testPassRate < 100) {
    recommendations.push('Focus on passing all test cases');
  }
  
  if (testPassRate >= 80 && testPassRate < 100 && executionTime !== null && executionTime > 500) {
    recommendations.push('Optimize time complexity for better performance');
  }
  if (complexityScore > 75 && testPassRate >= 80) {
    recommendations.push('Refactor code for better readability');
  }
  if (codeLength > 300 && testPassRate >= 80) {
    recommendations.push('Try to make the solution more concise');
  }
  if (testPassRate >= 80 && score >= 85) {
    recommendations.push('Ready for the next question');
  }

  // Deduplicate and format
  const uniq = (arr) => Array.from(new Set(arr)).filter(x => x).slice(0, 5);

  return {
    score: Math.round(score),
    feedback: uniq(feedback).join(' '),
    strengths: uniq(strengths),
    weaknesses: uniq(weaknesses),
    recommendations: uniq(recommendations),
  };
};

module.exports = { generateFeedback };
