const config = require('../config/config');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

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

/**
 * Evaluate a student's answer (code + explanation).
 */
const evaluateAnswer = async ({ question, code, language, explanation }) => {
  let codeEval = { codeCorrectness: 0, codeQuality: 0, feedback: '', strengths: [], improvements: [] };
  let explEval = { explanationClarity: 0, reasoningDepth: 0, structuredThinking: 0 };

  // Evaluate code if present
  if (code && code.trim()) {
    try {
      const prompt = PROMPTS.evaluateCode(question, code, language);
      const result = await callLLM(prompt);
      codeEval = result || MOCK_RESPONSES.evaluateCode();
    } catch {
      codeEval = MOCK_RESPONSES.evaluateCode();
    }
  }

  // Evaluate explanation if present
  if (explanation && explanation.trim()) {
    try {
      const prompt = PROMPTS.evaluateExplanation(question, explanation);
      const result = await callLLM(prompt);
      explEval = result || MOCK_RESPONSES.evaluateExplanation();
    } catch {
      explEval = MOCK_RESPONSES.evaluateExplanation();
    }
  }

  // Calculate overall score
  const hasCode = code && code.trim();
  const hasExplanation = explanation && explanation.trim();

  let overallScore;
  if (hasCode && hasExplanation) {
    overallScore = Math.round(
      codeEval.codeCorrectness * 0.35 +
      codeEval.codeQuality * 0.15 +
      explEval.explanationClarity * 0.2 +
      explEval.reasoningDepth * 0.15 +
      explEval.structuredThinking * 0.15
    );
  } else if (hasCode) {
    overallScore = Math.round(codeEval.codeCorrectness * 0.6 + codeEval.codeQuality * 0.4);
  } else if (hasExplanation) {
    overallScore = Math.round(
      explEval.explanationClarity * 0.4 +
      explEval.reasoningDepth * 0.35 +
      explEval.structuredThinking * 0.25
    );
  } else {
    overallScore = 0;
  }

  return {
    codeCorrectness: codeEval.codeCorrectness || 0,
    codeQuality: codeEval.codeQuality || 0,
    explanationClarity: explEval.explanationClarity || 0,
    reasoningDepth: explEval.reasoningDepth || 0,
    structuredThinking: explEval.structuredThinking || 0,
    overallScore,
    feedback: codeEval.feedback || explEval.feedback || '',
    strengths: [...(codeEval.strengths || []), ...(explEval.strengths || [])],
    improvements: [...(codeEval.improvements || []), ...(explEval.improvements || [])],
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
