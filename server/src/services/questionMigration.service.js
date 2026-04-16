const { randomUUID } = require('crypto');
const { Question } = require('../models');
const aiService = require('./ai.service');
const logger = require('../config/logger');

const FALLBACK_STARTER_CODE = {
  javascript: 'function solve(input) {\n  // Write your solution\n}\n',
  python: 'def solve(input_data):\n    # Write your solution\n    pass\n',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  // Write your solution\n  return 0;\n}\n',
  java: 'class Solution {\n  public static void main(String[] args) {\n    // Write your solution\n  }\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n  // Write your solution\n  return 0;\n}\n',
};

const TOPIC_MAP = {
  system: 'system-design',
  system_design: 'system-design',
  systemdesign: 'system-design',
  linkedlist: 'linked-lists',
  linked_list: 'linked-lists',
  stack: 'stacks-queues',
  queue: 'stacks-queues',
  hashtable: 'hash-tables',
  hash_table: 'hash-tables',
  bit: 'bit-manipulation',
};

const VALID_TOPICS = new Set(Question.schema.path('topic').enumValues);
const VALID_TYPES = new Set(Question.schema.path('type').enumValues);
const CONCEPTUAL_TOPICS = new Set(['databases', 'networking', 'os-concepts', 'system-design']);

const PLACEHOLDER_TESTCASE_EXPLANATION = 'Replace this placeholder with a real test case.';
const FALLBACK_TESTCASE_EXPLANATION = 'Auto-generated fallback test case due missing source examples.';

function clampDifficulty(raw) {
  const parsed = Number.isFinite(raw) ? raw : parseInt(raw, 10);
  if (!parsed || Number.isNaN(parsed)) return 3;
  if (parsed < 1) return 1;
  if (parsed > 5) return 5;
  return Math.round(parsed);
}

function normalizeTopic(rawTopic) {
  if (!rawTopic || typeof rawTopic !== 'string') return 'arrays';
  const normalized = rawTopic.trim().toLowerCase();
  if (VALID_TOPICS.has(normalized)) return normalized;
  return TOPIC_MAP[normalized] || 'arrays';
}

function inferType(question) {
  const explicitType = question.type && VALID_TYPES.has(question.type) ? question.type : null;
  if (explicitType === 'behavioral' || explicitType === 'system-design') return explicitType;

  const topic = normalizeTopic(question.topic);
  if (CONCEPTUAL_TOPICS.has(topic)) return 'conceptual';

  const rubric = question.rubric;
  const rubricSize =
    rubric instanceof Map
      ? rubric.size
      : (rubric && typeof rubric === 'object' ? Object.keys(rubric).length : 0);
  if (rubricSize > 0) return 'conceptual';

  const expectedKeyPoints = Array.isArray(question.expectedKeyPoints)
    ? question.expectedKeyPoints.filter(Boolean)
    : [];

  const starterCode = question.starterCode
    ? (question.starterCode instanceof Map
      ? Object.fromEntries(question.starterCode)
      : question.starterCode)
    : {};
  const starterCodeSize = starterCode && typeof starterCode === 'object'
    ? Object.keys(starterCode).length
    : 0;

  if (expectedKeyPoints.length > 0 && starterCodeSize === 0) return 'conceptual';

  const title = String(question.title || '').toLowerCase();
  const description = String(question.description || '').trim().toLowerCase();
  const conceptualPromptStyle =
    title.startsWith('explain') ||
    title.startsWith('what is') ||
    title.startsWith('design ') ||
    description.startsWith('explain ') ||
    description.startsWith('what is ');

  if (!CONCEPTUAL_TOPICS.has(topic)) return 'coding';

  if (explicitType === 'coding') return 'coding';
  if (conceptualPromptStyle && expectedKeyPoints.length > 0 && starterCodeSize === 0) {
    return 'conceptual';
  }

  if (Array.isArray(question.testCases) && question.testCases.length > 0) return 'coding';

  if (starterCodeSize > 0) return 'coding';

  if (expectedKeyPoints.length > 0 && starterCodeSize === 0) return 'conceptual';

  return 'coding';
}

function defaultConstraints() {
  return ['Aim for an efficient approach.', 'Handle edge cases in your solution.'];
}

function defaultHints() {
  return ['Start with a brute force idea, then optimize.', 'Think about data structures that reduce lookup time.'];
}

function defaultCodingTestCases() {
  return [
    {
      input: '0\n',
      expectedOutput: '0',
      isHidden: true,
      explanation: FALLBACK_TESTCASE_EXPLANATION,
    },
  ];
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function sanitizeTestCases(testCases) {
  if (!Array.isArray(testCases)) return [];
  return testCases
    .map((testCase) => {
      if (!testCase) return null;
      const input = typeof testCase.input === 'string' ? testCase.input : String(testCase.input ?? '');
      const expectedOutput =
        typeof testCase.expectedOutput === 'string'
          ? testCase.expectedOutput
          : String(testCase.expectedOutput ?? '');
      if (!input && !expectedOutput) return null;

      return {
        input,
        expectedOutput,
        isHidden: Boolean(testCase.isHidden),
        explanation:
          typeof testCase.explanation === 'string' && testCase.explanation.trim()
            ? testCase.explanation.trim()
            : undefined,
      };
    })
    .filter(Boolean);
}

function hasPlaceholderTestCase(testCases) {
  if (!Array.isArray(testCases) || testCases.length === 0) return false;
  return testCases.some((testCase) => {
    const explanation = String(testCase.explanation || '').trim();
    const input = String(testCase.input || '').trim().toLowerCase();
    const expectedOutput = String(testCase.expectedOutput || '').trim().toLowerCase();
    return (
      explanation === PLACEHOLDER_TESTCASE_EXPLANATION ||
      explanation === FALLBACK_TESTCASE_EXPLANATION ||
      (input === 'sample input' && expectedOutput === 'sample output')
    );
  });
}

function extractTestCasesFromDescription(description) {
  if (!description || typeof description !== 'string') return [];
  const testCases = [];

  // Matches patterns like: Input: ... Output: ... [Explanation: ...]
  const regex = /Input:\s*([\s\S]*?)\s*Output:\s*([\s\S]*?)(?=\n\s*(?:Input:|Example|$))/gi;
  let match;
  while ((match = regex.exec(description)) !== null && testCases.length < 3) {
    const input = String(match[1] || '').trim();
    const expectedOutput = String(match[2] || '').trim();
    if (!input || !expectedOutput) continue;
    testCases.push({
      input,
      expectedOutput,
      isHidden: testCases.length > 0,
      explanation: undefined,
    });
  }

  return sanitizeTestCases(testCases);
}

async function enrichWithAi(topic, difficulty, type) {
  try {
    const generated = await aiService.generateQuestion(topic, difficulty, type);
    return generated || null;
  } catch (err) {
    logger.warn(`AI enrichment failed for topic=${topic}, difficulty=${difficulty}: ${err.message}`);
    return null;
  }
}

function diffUpdate(currentDoc, updateDoc) {
  const changedFields = [];
  Object.keys(updateDoc).forEach((key) => {
    const before = JSON.stringify(currentDoc[key]);
    const after = JSON.stringify(updateDoc[key]);
    if (before !== after) changedFields.push(key);
  });
  return changedFields;
}

async function buildNormalizedUpdate(question, options) {
  const issues = [];
  const update = {};

  if (!question.title || !question.description) {
    issues.push('missing_title_or_description');
    return { skip: true, issues, update: null, changedFields: [] };
  }

  const normalizedTopic = normalizeTopic(question.topic);
  const normalizedDifficulty = clampDifficulty(question.difficulty);
  const normalizedType = inferType(question);

  update.topic = normalizedTopic;
  update.difficulty = normalizedDifficulty;
  update.type = normalizedType;
  update.constraints = sanitizeStringArray(question.constraints);
  update.hints = sanitizeStringArray(question.hints);
  update.expectedKeyPoints = sanitizeStringArray(question.expectedKeyPoints);
  update.tags = sanitizeStringArray(question.tags);
  update.solutionApproach =
    typeof question.solutionApproach === 'string' ? question.solutionApproach.trim() : '';
  update.timeComplexity =
    typeof question.timeComplexity === 'string' ? question.timeComplexity.trim() : '';
  update.spaceComplexity =
    typeof question.spaceComplexity === 'string' ? question.spaceComplexity.trim() : '';
  update.estimatedTimeMinutes =
    Number.isFinite(question.estimatedTimeMinutes) && question.estimatedTimeMinutes > 0
      ? Math.min(Math.round(question.estimatedTimeMinutes), 120)
      : 15;
  update.isActive = question.isActive !== false;
  update.source = question.source || 'manual';

  if (normalizedType === 'coding') {
    const existingStarterCode = question.starterCode ? Object.fromEntries(question.starterCode) : {};
    update.starterCode = {
      ...FALLBACK_STARTER_CODE,
      ...existingStarterCode,
    };

    update.testCases = sanitizeTestCases(question.testCases);
    if (update.testCases.length === 0 || hasPlaceholderTestCase(update.testCases)) {
      const extracted = extractTestCasesFromDescription(question.description);
      if (extracted.length > 0) {
        update.testCases = extracted;
        issues.push('test_cases_extracted_from_description');
      } else {
        issues.push('missing_test_cases');
        update.testCases = defaultCodingTestCases();
      }
    }

    if (update.constraints.length === 0) {
      update.constraints = defaultConstraints();
      issues.push('missing_constraints');
    }

    if (update.hints.length === 0) {
      update.hints = defaultHints();
      issues.push('missing_hints');
    }

    if (!update.solutionApproach) {
      update.solutionApproach = 'Explain your approach and justify complexity choices.';
      issues.push('missing_solution_approach');
    }

    if (!update.timeComplexity) {
      update.timeComplexity = 'O(n)';
      issues.push('missing_time_complexity');
    }

    if (!update.spaceComplexity) {
      update.spaceComplexity = 'O(n)';
      issues.push('missing_space_complexity');
    }
  } else {
    update.starterCode = question.starterCode ? Object.fromEntries(question.starterCode) : {};
    update.testCases = [];
    update.constraints = sanitizeStringArray(question.constraints);
    update.hints = sanitizeStringArray(question.hints);
  }

  if (options.useAi && issues.length > 0) {
    const generated = await enrichWithAi(normalizedTopic, normalizedDifficulty, normalizedType);
    if (generated) {
      if (!update.solutionApproach && generated.solutionApproach) update.solutionApproach = generated.solutionApproach;
      if (!update.timeComplexity && generated.timeComplexity) update.timeComplexity = generated.timeComplexity;
      if (!update.spaceComplexity && generated.spaceComplexity) update.spaceComplexity = generated.spaceComplexity;
      if (update.constraints.length === 0) update.constraints = sanitizeStringArray(generated.constraints);
      if (update.hints.length === 0) update.hints = sanitizeStringArray(generated.hints);
      if (update.expectedKeyPoints.length === 0) {
        update.expectedKeyPoints = sanitizeStringArray(generated.expectedKeyPoints);
      }
      if (normalizedType === 'coding' && update.testCases.length <= 1 && Array.isArray(generated.testCases)) {
        const generatedTestCases = sanitizeTestCases(generated.testCases);
        if (generatedTestCases.length > 0) {
          update.testCases = generatedTestCases;
        }
      }
      if (normalizedType === 'coding' && Object.keys(update.starterCode).length === 0 && generated.starterCode) {
        update.starterCode = {
          ...FALLBACK_STARTER_CODE,
          ...generated.starterCode,
        };
      }
    }
  }

  const changedFields = diffUpdate(question.toObject({ flattenMaps: true }), update);
  return {
    skip: false,
    update,
    issues,
    changedFields,
  };
}

async function backupQuestions(runId, questions) {
  if (!questions.length) return 0;

  const backupDocs = questions.map((question) => ({
    runId,
    questionId: question._id,
    question: question.toObject(),
    createdAt: new Date(),
  }));

  await Question.db.collection('question_migration_backups').insertMany(backupDocs);
  return backupDocs.length;
}

async function runQuestionMigration(options = {}) {
  const config = {
    apply: Boolean(options.apply),
    dryRun: options.dryRun !== false,
    backup: options.backup !== false,
    useAi: Boolean(options.useAi),
    batchSize: options.batchSize || 25,
  };

  const runId = randomUUID();
  const summary = {
    runId,
    mode: config.apply ? 'apply' : 'dry-run',
    backupEnabled: config.backup,
    useAi: config.useAi,
    totalScanned: 0,
    eligibleForUpdate: 0,
    updated: 0,
    skipped: 0,
    backupCount: 0,
    failures: 0,
    issues: {},
  };

  const cursor = Question.find({}).cursor();
  let pendingUpdates = [];
  let pendingBackups = [];

  for await (const question of cursor) {
    summary.totalScanned += 1;

    try {
      const normalized = await buildNormalizedUpdate(question, config);
      if (normalized.skip) {
        summary.skipped += 1;
        normalized.issues.forEach((issue) => {
          summary.issues[issue] = (summary.issues[issue] || 0) + 1;
        });
        continue;
      }

      normalized.issues.forEach((issue) => {
        summary.issues[issue] = (summary.issues[issue] || 0) + 1;
      });

      if (normalized.changedFields.length === 0) {
        continue;
      }

      summary.eligibleForUpdate += 1;

      if (!config.apply) {
        continue;
      }

      pendingUpdates.push({
        updateOne: {
          filter: { _id: question._id },
          update: {
            $set: {
              ...normalized.update,
              migrationVersion: 'v1-seeded-shape',
              migrationUpdatedAt: new Date(),
            },
          },
        },
      });
      pendingBackups.push(question);

      if (pendingUpdates.length >= config.batchSize) {
        if (config.backup) {
          summary.backupCount += await backupQuestions(runId, pendingBackups);
        }
        const result = await Question.bulkWrite(pendingUpdates, { ordered: false });
        summary.updated += result.modifiedCount || 0;
        pendingUpdates = [];
        pendingBackups = [];
      }
    } catch (error) {
      summary.failures += 1;
      logger.error(`Question migration failure for ${question._id}: ${error.message}`);
    }
  }

  if (config.apply && pendingUpdates.length > 0) {
    if (config.backup) {
      summary.backupCount += await backupQuestions(runId, pendingBackups);
    }
    const result = await Question.bulkWrite(pendingUpdates, { ordered: false });
    summary.updated += result.modifiedCount || 0;
  }

  return summary;
}

module.exports = {
  runQuestionMigration,
};
