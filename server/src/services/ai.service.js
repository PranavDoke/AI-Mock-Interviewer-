const config = require('../config/config');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const executionService = require('./execution.service');
const { extractFeatures, extractExplanationFeatures } = require('../eval/featureExtractor');
const { computeScore, explanationScoreFrom } = require('../eval/scoring');
const { generateFeedback } = require('../eval/feedbackEngine');
const { predictScore } = require('../eval/mlClient');

/**
 * AI Service — Abstract provider layer.
 *
 * Supports: 'groq', 'huggingface', 'ollama', 'mock'
 * All providers use OpenAI-compatible API format.
 */

// ------------------------------------------------------------------
// Provider configuration
// ------------------------------------------------------------------
const PROVIDER_CONFIG = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  huggingface: {
    baseUrl: 'https://router.huggingface.co/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
  },
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
  },
  mock: {
    baseUrl: '',
    defaultModel: 'mock',
  },
};

// ------------------------------------------------------------------
// LLM Client (OpenAI-compatible)
// ------------------------------------------------------------------
let openaiClient = null;

const getClient = () => {
  if (openaiClient) return openaiClient;

  const provider = config.ai.provider;

  if (provider === 'mock') {
    return null; // Use mock responses
  }

  // Dynamic import of OpenAI SDK
  const OpenAI = require('openai');
  const providerConfig = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.groq;

  openaiClient = new OpenAI({
    apiKey: config.ai.apiKey,
    baseURL: config.ai.baseUrl || providerConfig.baseUrl,
  });

  return openaiClient;
};

// ------------------------------------------------------------------
// Prompt Templates
// ------------------------------------------------------------------
const PROMPTS = {
  evaluateCode: (question, code, language) => `
You are an expert technical interviewer evaluating a candidate's code solution.

**Question:**
${question.title}
${question.description}

**Candidate's Code (${language}):**
\`\`\`${language}
${code}
\`\`\`

**Expected Approach:** ${question.solutionApproach || 'N/A'}
**Expected Time Complexity:** ${question.timeComplexity || 'N/A'}
**Expected Space Complexity:** ${question.spaceComplexity || 'N/A'}

Evaluate the code and respond in EXACTLY this JSON format (no markdown, no extra text):
{
  "codeCorrectness": <0-100>,
  "codeQuality": <0-100>,
  "feedback": "<detailed feedback>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
}

Scoring guide:
- codeCorrectness: Does it solve the problem? Handle edge cases? Correct algorithm?
- codeQuality: Clean code? Good naming? Efficient? Proper structure?`,

  evaluateExplanation: (question, explanation) => `
You are an expert technical interviewer evaluating a candidate's verbal explanation.

**Question:**
${question.title}
${question.description}

**Expected Key Points:** ${(question.expectedKeyPoints || []).join(', ') || 'N/A'}

**Candidate's Explanation:**
${explanation}

Evaluate and respond in EXACTLY this JSON format (no markdown, no extra text):
{
  "explanationClarity": <0-100>,
  "reasoningDepth": <0-100>,
  "structuredThinking": <0-100>,
  "feedback": "<detailed feedback>",
  "strengths": ["<strength 1>"],
  "improvements": ["<improvement 1>"]
}

Scoring guide:
- explanationClarity: Clear communication? Well-organized?
- reasoningDepth: Deep understanding? Considers alternatives?
- structuredThinking: Logical progression? Systematic approach?`,

  generateQuestion: (topic, difficulty, type) => `
You are a technical interview question designer.

Generate a ${type} question about "${topic}" at difficulty level ${difficulty}/5.

Respond in EXACTLY this JSON format (no markdown, no extra text):
{
  "title": "<short title>",
  "description": "<full question description with examples>",
  "constraints": ["<constraint 1>"],
  "hints": ["<hint 1>"],
  "solutionApproach": "<brief solution approach>",
  "timeComplexity": "<expected time complexity>",
  "spaceComplexity": "<expected space complexity>",
  "expectedKeyPoints": ["<key point 1>"],
  "estimatedTimeMinutes": <number>,
  "testCases": [
    {"input": "<input>", "expectedOutput": "<output>", "explanation": "<why>"}
  ],
  "starterCode": {
    "javascript": "<starter code>",
    "python": "<starter code>"
  }
}`,

  generateSessionSummary: (session) => {
    const submissions = session.submissions.map((s, i) => ({
      questionIndex: i + 1,
      score: s.evaluation?.overallScore || 0,
      topic: session.difficultyProgression[i]?.topic || 'unknown',
      difficulty: session.difficultyProgression[i]?.difficulty || 3,
    }));

    return `
You are a technical interview coach summarizing a candidate's performance.

**Session Results:**
${JSON.stringify(submissions, null, 2)}

**Overall Score:** ${session.scores?.overall || 0}%
**Accuracy:** ${session.scores?.accuracy || 0}%

Provide a constructive summary in EXACTLY this JSON format (no markdown, no extra text):
{
  "overallFeedback": "<2-3 sentence summary>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>"],
  "recommendations": ["<specific recommendation 1>"],
  "nextSteps": ["<actionable next step 1>"]
}`;
  },
};

// ------------------------------------------------------------------
// Mock responses (for development without AI API)
// ------------------------------------------------------------------
const MOCK_RESPONSES = {
  evaluateCode: () => ({
    codeCorrectness: 65 + Math.floor(Math.random() * 25),
    codeQuality: 60 + Math.floor(Math.random() * 30),
    feedback: 'Your solution demonstrates a solid understanding of the problem. Consider optimizing the time complexity and handling more edge cases.',
    strengths: ['Correct base logic', 'Clean code structure'],
    improvements: ['Add edge case handling', 'Consider space optimization'],
  }),

  evaluateExplanation: () => ({
    explanationClarity: 60 + Math.floor(Math.random() * 30),
    reasoningDepth: 55 + Math.floor(Math.random() * 35),
    structuredThinking: 60 + Math.floor(Math.random() * 30),
    feedback: 'Good explanation with clear reasoning. Try to discuss trade-offs and alternative approaches more.',
    strengths: ['Clear communication'],
    improvements: ['Discuss time/space trade-offs'],
  }),

  generateSessionSummary: (session) => ({
    overallFeedback: `You completed the session with a score of ${session.scores?.overall || 0}%. Your performance shows consistent improvement across questions.`,
    strengths: ['Completed all questions', 'Good problem-solving approach'],
    weaknesses: ['Time management could improve'],
    recommendations: ['Practice timed coding exercises', 'Review data structure fundamentals'],
    nextSteps: ['Attempt harder difficulty questions', 'Focus on weaker topics'],
  }),
};

// ------------------------------------------------------------------
// Core AI functions
// ------------------------------------------------------------------

/**
 * Send a prompt to the LLM and parse JSON response.
 */
const callLLM = async (prompt, maxTokens = 1000) => {
  const client = getClient();

  if (!client) {
    // Mock mode
    return null;
  }

  try {
    const model = config.ai.model || PROVIDER_CONFIG[config.ai.provider]?.defaultModel;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a precise technical evaluator. Always respond with valid JSON only, no markdown formatting.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.3, // Low temperature for consistent evaluations
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Empty response from AI');
    }

    // Parse JSON, stripping markdown code fences if present
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    logger.error(`AI API error: ${error.message}`);
    throw new ApiError(502, `AI evaluation failed: ${error.message}`);
  }
};

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const uniq = (items) => Array.from(new Set((items || []).filter(Boolean)));

const buildDeterministicExplanationEval = (features) => {
  if (!features.hasExplanation) {
    return {
      explanationClarity: 0,
      reasoningDepth: 0,
      structuredThinking: 0,
      approachRelevance: 0,
      explanationCompleteness: 0,
      feedback: '',
      strengths: [],
      improvements: [],
    };
  }

  const strengths = [];
  const improvements = [];

  if (features.approachRelevance >= 70) {
    strengths.push('Explanation aligns with the expected approach');
  } else {
    improvements.push('Connect the explanation more directly to the expected approach');
  }

  if (features.reasoningDepth >= 70) {
    strengths.push('Reasoning includes useful implementation details');
  } else {
    improvements.push('Explain why the algorithm works and mention edge cases');
  }

  if (features.structuredThinking < 55) {
    improvements.push('Organize the explanation into clear steps');
  }

  return {
    explanationClarity: features.explanationClarity,
    reasoningDepth: features.reasoningDepth,
    structuredThinking: features.structuredThinking,
    approachRelevance: features.approachRelevance,
    explanationCompleteness: features.explanationCompleteness,
    feedback: features.explanationCompleteness >= 70
      ? 'The explanation is clear and mostly aligned with the expected approach.'
      : 'The explanation needs more detail about the algorithm, edge cases, and complexity.',
    strengths,
    improvements,
  };
};

const blendExplanationEval = (llmEval, deterministicEval) => {
  if (!llmEval) return deterministicEval;

  const average = (a, b) => clampScore((Number(a || 0) * 0.5) + (Number(b || 0) * 0.5));

  return {
    explanationClarity: average(llmEval.explanationClarity, deterministicEval.explanationClarity),
    reasoningDepth: average(llmEval.reasoningDepth, deterministicEval.reasoningDepth),
    structuredThinking: average(llmEval.structuredThinking, deterministicEval.structuredThinking),
    approachRelevance: deterministicEval.approachRelevance,
    explanationCompleteness: deterministicEval.explanationCompleteness,
    feedback: llmEval.feedback || deterministicEval.feedback,
    strengths: uniq([...(deterministicEval.strengths || []), ...(llmEval.strengths || [])]),
    improvements: uniq([...(deterministicEval.improvements || []), ...(llmEval.improvements || [])]),
  };
};

const combineSubmissionScores = ({ codeScore = 0, explanationScore = 0, hasCode = false, hasExplanation = false }) => {
  if (hasCode && hasExplanation) {
    return clampScore((codeScore * 0.85) + (explanationScore * 0.15));
  }

  if (hasCode) return clampScore(codeScore);
  if (hasExplanation) return clampScore(explanationScore);
  return 0;
};

/**
 * Evaluate a student's answer (code + explanation).
 */
const evaluateAnswer = async ({ question, code, language, explanation }) => {
  let codeEval = { codeCorrectness: 0, codeQuality: 0, feedback: '', strengths: [], improvements: [] };
  let explEval = {
    explanationClarity: 0,
    reasoningDepth: 0,
    structuredThinking: 0,
    approachRelevance: 0,
    explanationCompleteness: 0,
    feedback: '',
    strengths: [],
    improvements: [],
  };

  const hasCode = !!(code && code.trim());
  const explanationFeatures = extractExplanationFeatures({ question, explanation });

  if (explanationFeatures.hasExplanation) {
    const deterministicExplanation = buildDeterministicExplanationEval(explanationFeatures);
    try {
      const prompt = PROMPTS.evaluateExplanation(question, explanation);
      const llmExplanation = await callLLM(prompt);
      explEval = blendExplanationEval(llmExplanation, deterministicExplanation);
    } catch {
      explEval = deterministicExplanation;
    }
  }

  const explanationScore = explanationScoreFrom({
    hasExplanation: explanationFeatures.hasExplanation,
    ...explEval,
  });

  // Evaluate code if present — use deterministic pipeline + optional ML
  if (hasCode) {
    try {
      // If question provides test cases, run them
      let testResults = [];
      if (question.testCases && Array.isArray(question.testCases) && question.testCases.length) {
        try {
          testResults = await executionService.runTestCases(code, language, question.testCases, question);
          
          // Check if Piston is unavailable
          const pistonUnavailable = testResults.some(r => r.error && r.error.includes('Piston'));
          if (pistonUnavailable) {
            logger.warn(`⚠ PISTON API UNAVAILABLE - Test execution failed`);
            logger.warn(`  Please ensure Piston is running at http://localhost:2000`);
            logger.warn(`  Or update PISTON_URL in server/.env file`);
          }
          
          logger.info(`✓ Test execution completed`, { 
            language,
            totalTests: question.testCases.length, 
            passed: testResults.filter(r => r.passed).length,
            failed: testResults.filter(r => !r.passed).length,
            testPassRate: testResults.length > 0 ? Math.round((testResults.filter(r => r.passed).length / testResults.length) * 100) + '%' : 'N/A',
            pistonUnavailable
          });
          
          // Log individual test results
          testResults.forEach((result, idx) => {
            logger.debug(`Test ${idx + 1}:`, {
              input: result.input.substring(0, 50),
              expected: result.expectedOutput.substring(0, 30),
              actual: result.actualOutput.substring(0, 30),
              passed: result.passed ? '✓' : '✗',
              error: result.error ? result.error.substring(0, 50) : 'none'
            });
          });
        } catch (err) {
          logger.error(`✗ Test execution failed: ${err.message}`, { stack: err.stack });
          testResults = [];
        }
      }

      const totalTestCases = testResults.length;
      const passedTestCases = testResults.filter((r) => r.passed).length;
      const correctness = totalTestCases > 0 ? Math.round((passedTestCases / totalTestCases) * 100) : 0;
      const avgExecutionTimeMs = totalTestCases > 0
        ? Math.round(testResults.reduce((sum, r) => sum + (r.executionTimeMs || 0), 0) / totalTestCases)
        : null;

      const codeFeatures = extractFeatures({ code, language, testResults });
      const features = {
        ...codeFeatures,
        ...explanationFeatures,
        explanationClarity: explEval.explanationClarity || explanationFeatures.explanationClarity,
        reasoningDepth: explEval.reasoningDepth || explanationFeatures.reasoningDepth,
        structuredThinking: explEval.structuredThinking || explanationFeatures.structuredThinking,
        approachRelevance: explEval.approachRelevance ?? explanationFeatures.approachRelevance,
        explanationCompleteness: explEval.explanationCompleteness || explanationFeatures.explanationCompleteness,
        passedTestCases,
        totalTestCases,
      };
      logger.info(`✓ Features extracted`, { 
        testPassRate: features.testPassRate + '%',
        codeLength: features.codeLength + ' lines',
        implementationCompleteness: features.implementationCompleteness + '%',
        hasMeaningfulCode: features.hasMeaningfulCode ? '✓' : '✗',
        complexityScore: features.complexityScore + '/100'
      });

      // Deterministic score
      const { overallScore: detScore, components } = computeScore(features);
      const codeQualityScore = (features.hasMeaningfulCode && features.implementationCompleteness > 0)
        ? (components.codeQualityScore || 0)
        : 0;
      logger.info(`✓ Deterministic score computed`, { 
        detScore,
        testPassRate: features.testPassRate + '%',
        codeQualityScore,
        efficiencyScore: components.efficiencyScore,
        explanationScore
      });

      // Start from deterministic execution/static analysis, then let the trained model calibrate it.
      let codeScore = detScore;

      // If the submission has no meaningful implementation, correctness should dominate.
      if (!features.hasMeaningfulCode || features.implementationCompleteness <= 0) {
        codeScore = 0;
        logger.warn(`⚠ Score adjusted to 0 due to no meaningful code`);
      } else if (features.testPassRate === 0) {
        codeScore = Math.min(codeScore, 15);
        logger.warn(`⚠ Score capped at 15 due to 0 test pass rate`);
      }

      let overallScore = combineSubmissionScores({
        codeScore,
        explanationScore,
        hasCode: true,
        hasExplanation: explanationFeatures.hasExplanation,
      });

      const mlPayload = {
        ...features,
        codeQualityScore,
        explanationScore,
        hasMeaningfulCode: features.hasMeaningfulCode,
        hasExplanation: explanationFeatures.hasExplanation,
      };
      const mlResult = await predictScore(mlPayload);
      const mlPred = Number.isFinite(mlResult.predictedScore)
        ? clampScore(mlResult.predictedScore)
        : null;

      if (mlPred !== null) {
        overallScore = clampScore((overallScore * 0.7) + (mlPred * 0.3));
      }

      if (correctness === 100 && features.hasMeaningfulCode) {
        overallScore = explanationFeatures.hasExplanation
          ? Math.max(overallScore, 95)
          : 100;
      }

      const feedbackFeatures = {
        ...features,
        codeQualityScore,
      };
      const fb = generateFeedback({ features: feedbackFeatures, score: overallScore });
      logger.info(`✓ Final score calculated`, { 
        overallScore,
        testPassRate: features.testPassRate + '%',
        mlUsed: !!mlResult.usedModel,
        mlPrediction: mlPred,
        feedbackGenerated: fb.feedback.length + ' chars'
      });

      codeEval = {
        codeCorrectness: correctness,
        codeQuality: codeQualityScore,
        feedback: fb.feedback,
        strengths: fb.strengths,
        improvements: fb.weaknesses,
        recommendations: fb.recommendations || [],
        features: feedbackFeatures,
        overallScore,
        passedTestCases,
        totalTestCases,
        avgExecutionTimeMs,
        testResults,
        mlUsed: !!mlResult.usedModel,
        mlPrediction: mlPred,
      };
    } catch (err) {
      logger.error(`Evaluation pipeline error: ${err.message}`, { stack: err.stack });
      const fallback = MOCK_RESPONSES.evaluateCode();
      codeEval = {
        ...fallback,
        overallScore: fallback.codeCorrectness || 0,
        recommendations: fallback.improvements || [],
      };
    }
  }

  // Calculate overall score
  const hasExplanation = explanationFeatures.hasExplanation;

  let overallScore;
  if (hasCode) {
    overallScore = clampScore(codeEval.overallScore);
  } else if (hasExplanation) {
    overallScore = explanationScore;
  } else {
    overallScore = 0;
  }

  return {
    codeCorrectness: codeEval.codeCorrectness || 0,
    codeQuality: codeEval.codeQuality || 0,
    explanationClarity: explEval.explanationClarity || 0,
    reasoningDepth: explEval.reasoningDepth || 0,
    structuredThinking: explEval.structuredThinking || 0,
    approachRelevance: explEval.approachRelevance || 0,
    explanationCompleteness: explEval.explanationCompleteness || 0,
    overallScore,
    feedback: codeEval.feedback || explEval.feedback || '',
    strengths: [...(codeEval.strengths || []), ...(explEval.strengths || [])],
    improvements: [...(codeEval.improvements || []), ...(explEval.improvements || [])],
    recommendations: uniq([...(codeEval.recommendations || []), ...(explEval.improvements || [])]),
    passedTestCases: codeEval.passedTestCases ?? 0,
    totalTestCases: codeEval.totalTestCases ?? 0,
    avgExecutionTimeMs: codeEval.avgExecutionTimeMs ?? null,
    testResults: codeEval.testResults || [],
    mlUsed: codeEval.mlUsed || false,
    mlPrediction: codeEval.mlPrediction || null,
  };
};

/**
 * Generate a new question using AI.
 */
const generateQuestion = async (topic, difficulty, type = 'coding') => {
  try {
    const prompt = PROMPTS.generateQuestion(topic, difficulty, type);
    const result = await callLLM(prompt, 2000);

    if (!result) {
      throw new Error('Mock mode — cannot generate questions');
    }

    return {
      ...result,
      topic,
      difficulty,
      type,
      source: 'ai-generated',
    };
  } catch (error) {
    logger.error(`Question generation failed: ${error.message}`);
    throw new ApiError(502, 'Failed to generate question via AI.');
  }
};

/**
 * Generate session summary using AI.
 */
const generateSessionSummary = async (session) => {
  try {
    const prompt = PROMPTS.generateSessionSummary(session);
    const result = await callLLM(prompt);
    return result || MOCK_RESPONSES.generateSessionSummary(session);
  } catch {
    return MOCK_RESPONSES.generateSessionSummary(session);
  }
};

module.exports = {
  evaluateAnswer,
  generateQuestion,
  generateSessionSummary,
  callLLM,
};
