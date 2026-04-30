const esprima = require('esprima');

/**
 * Extract simple features from code and test results.
 * @param {Object} params
 * @param {string} params.code
 * @param {string} params.language
 * @param {Array} params.testResults
 */
const extractFeatures = ({ code = '', language = 'javascript', testResults = [] }) => {
  const lines = code.split('\n').filter((l) => l.trim() !== '').length;

  const passed = testResults.filter((t) => t.passed).length;
  const total = testResults.length || 0;
  const testPassRate = total === 0 ? 0 : Math.round((passed / total) * 100);

  const executionTimes = testResults.map((t) => t.executionTimeMs || 0).filter((n) => typeof n === 'number');
  const avgExecutionTime = executionTimes.length ? Math.round(executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length) : null;

  const errorCount = testResults.filter((t) => t.error || !t.passed).length;

  // Basic JS AST analysis for loops / recursion (best-effort)
  let numLoops = 0;
  let hasRecursion = false;
  try {
    if (language === 'javascript' && code.trim()) {
      const ast = esprima.parseScript(code, { tolerant: true });
      const stack = [ast];
      while (stack.length) {
        const node = stack.pop();
        if (!node || typeof node !== 'object') continue;
        if (node.type && /ForStatement|WhileStatement|DoWhileStatement/.test(node.type)) numLoops += 1;
        if (node.type === 'CallExpression' && node.callee && node.callee.name) {
          // naive recursion check: function name appears in call
          // (requires function declaration parsing)
        }
        for (const k of Object.keys(node)) {
          if (node[k] && typeof node[k] === 'object') stack.push(node[k]);
        }
      }
    } else if (language === 'python') {
      // Fallback: simple regex-based loop counts
      const forMatches = code.match(/\bfor\b/g) || [];
      const whileMatches = code.match(/\bwhile\b/g) || [];
      numLoops = forMatches.length + whileMatches.length;
      const funcMatches = code.match(/def\s+(\w+)\(/g) || [];
      if (funcMatches.length) {
        // naive recursion detection
        const funcNames = funcMatches.map((m) => m.replace(/def\s+/, '').replace(/\(/, '').trim());
        hasRecursion = funcNames.some((name) => new RegExp(`\\b${name}\\b`).test(code));
      }
    }
  } catch (e) {
    // ignore parsing errors; use fallbacks
  }

  // Complexity score heuristic: loops, recursion, and code length
  const complexityScore = Math.min(100, Math.round((numLoops * 5) + (hasRecursion ? 15 : 0) + (lines / 10)));

  return {
    testPassRate,
    executionTime: avgExecutionTime, // ms
    codeLength: lines,
    complexityScore,
    errorCount,
    numLoops,
    hasRecursion,
  };
};

module.exports = { extractFeatures };
