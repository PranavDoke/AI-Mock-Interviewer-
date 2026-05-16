const esprima = require('esprima');

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'if', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'then',
  'this', 'to', 'we', 'will', 'with', 'you', 'your',
]);

const tokenize = (text = '') => String(text)
  .toLowerCase()
  .replace(/[^a-z0-9_+\s]/g, ' ')
  .split(/\s+/)
  .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const keywordOverlapScore = (candidateText = '', referenceText = '') => {
  const referenceTokens = Array.from(new Set(tokenize(referenceText)));
  if (!referenceTokens.length) return 50;

  const candidateTokens = new Set(tokenize(candidateText));
  const matches = referenceTokens.filter((token) => candidateTokens.has(token)).length;
  return clamp(Math.round((matches / referenceTokens.length) * 100));
};

const stripComments = (code) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')
  .replace(/#.*$/gm, '');

const isPlaceholderOnly = (code, language) => {
  const normalized = stripComments(code).trim();
  if (!normalized) return true;

  const patterns = [
    /^(function\s+\w+\s*\([^)]*\)\s*\{\s*\})$/s,
    /^(class\s+\w+\s*\{\s*\})$/s,
    /^(def\s+\w+\s*\([^)]*\)\s*:\s*(pass|return\s+None)\s*)$/s,
    /^(public\s+.*\{\s*\})$/s,
    /^(.*\bpass\b.*)$/is,
    /^(.*\bTODO\b.*)$/is,
    /^(.*\bTBD\b.*)$/is,
  ];

  if (patterns.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  const significantTokens = normalized.replace(/[{}();\s]/g, '');
  if (significantTokens.length <= 5) return true;

  if (language === 'javascript') {
    const jsBoilerplate = /^(function\s+\w+\s*\([^)]*\)\s*\{|class\s+\w+\s*\{)$/s;
    if (jsBoilerplate.test(normalized) && !/[=+\-*/<>?:]|return\b|if\b|for\b|while\b/.test(normalized)) {
      return true;
    }
  }

  return false;
};

/**
 * Extract simple features from code and test results.
 * @param {Object} params
 * @param {string} params.code
 * @param {string} params.language
 * @param {Array} params.testResults
 */
const extractFeatures = ({ code = '', language = 'javascript', testResults = [] }) => {
  const trimmedCode = code.trim();
  const lines = trimmedCode ? trimmedCode.split('\n').filter((l) => l.trim() !== '').length : 0;
  const codeCharCount = trimmedCode.length;
  const placeholderOnly = isPlaceholderOnly(code, language);
  const hasMeaningfulCode = codeCharCount > 0 && !placeholderOnly;

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

  const meaningfulLineScore = clamp(Math.round((lines / 6) * 100));
  const lengthScore = clamp(Math.round((codeCharCount / 120) * 100));
  const completenessBase = placeholderOnly ? 0 : Math.round((meaningfulLineScore * 0.55) + (lengthScore * 0.45));
  const implementationCompleteness = clamp(completenessBase, 0, 100);

  // Complexity score heuristic: loops, recursion, and code size.
  const complexityScore = Math.min(100, Math.round((numLoops * 10) + (hasRecursion ? 20 : 0) + (lines * 4)));

  return {
    testPassRate,
    executionTime: avgExecutionTime, // ms
    codeLength: lines,
    codeCharCount,
    complexityScore,
    errorCount,
    numLoops,
    hasRecursion,
    implementationCompleteness,
    hasMeaningfulCode,
  };
};

const extractExplanationFeatures = ({ question = {}, explanation = '' }) => {
  const text = String(explanation || '').trim();
  const hasExplanation = text.length > 0;

  if (!hasExplanation) {
    return {
      hasExplanation: false,
      explanationWordCount: 0,
      explanationClarity: 0,
      reasoningDepth: 0,
      structuredThinking: 0,
      approachRelevance: 0,
      explanationCompleteness: 0,
    };
  }

  const words = tokenize(text);
  const wordCount = words.length;
  const sentenceCount = Math.max(1, (text.match(/[.!?]/g) || []).length);

  const expectedKeyPoints = Array.isArray(question.expectedKeyPoints)
    ? question.expectedKeyPoints.join(' ')
    : '';
  const referenceApproach = [
    question.solutionApproach,
    question.timeComplexity,
    question.spaceComplexity,
    expectedKeyPoints,
    question.title,
  ].filter(Boolean).join(' ');

  const approachRelevance = keywordOverlapScore(text, referenceApproach);
  const lengthScore = clamp(Math.round((Math.min(wordCount, 90) / 90) * 100));
  const concisePenalty = wordCount > 180 ? Math.min(25, Math.round((wordCount - 180) / 8)) : 0;

  const structureCues = [
    /\bfirst\b/i,
    /\bthen\b/i,
    /\bfinally\b/i,
    /\bbecause\b/i,
    /\btherefore\b/i,
    /\bedge case/i,
    /\bcomplexity\b/i,
    /\bo\([^)]+\)/i,
    /\bhash\b/i,
    /\bmap\b/i,
    /\bsort/i,
    /\btwo pointers/i,
    /\bdynamic programming/i,
  ];
  const cueMatches = structureCues.filter((pattern) => pattern.test(text)).length;
  const cueScore = clamp(Math.round((cueMatches / 6) * 100));

  const clarityBase = Math.round((lengthScore * 0.45) + (Math.min(sentenceCount * 18, 100) * 0.25) + (cueScore * 0.30));
  const explanationClarity = clamp(clarityBase - concisePenalty);

  const reasoningCues = [
    /\bwhy\b/i,
    /\bbecause\b/i,
    /\btrade.?off\b/i,
    /\balternative\b/i,
    /\boptimi[sz]e/i,
    /\btime complexity\b/i,
    /\bspace complexity\b/i,
    /\bedge case/i,
  ];
  const reasoningDepth = clamp(Math.round(
    (reasoningCues.filter((pattern) => pattern.test(text)).length / 5) * 100 * 0.65
    + approachRelevance * 0.35
  ));

  const structuredThinking = clamp(Math.round((cueScore * 0.55) + (lengthScore * 0.25) + (approachRelevance * 0.20)));
  const explanationCompleteness = clamp(Math.round(
    (explanationClarity * 0.25)
    + (reasoningDepth * 0.25)
    + (structuredThinking * 0.20)
    + (approachRelevance * 0.30)
  ));

  return {
    hasExplanation: true,
    explanationWordCount: wordCount,
    explanationClarity,
    reasoningDepth,
    structuredThinking,
    approachRelevance,
    explanationCompleteness,
  };
};

module.exports = { extractFeatures, extractExplanationFeatures };
