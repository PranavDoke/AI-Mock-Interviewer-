const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const { Question } = require('../src/models');
const { QUESTION_ENRICHMENT } = require('../src/data/question-enrichment');

const DEFAULT_FILE_PATH = path.join(__dirname, '../src/data/ai-mock-interviewer-all-unique-questions.json');
const QUESTION_SOURCE = 'leetcode-style';

const TOPIC_MAP = {
  array: 'arrays',
  arrays: 'arrays',
  string: 'string',
  strings: 'string',
  hashtable: 'hash-tables',
  hash: 'hash-tables',
  hashing: 'hashing',
  'hash-table': 'hash-tables',
  'hash-tables': 'hash-tables',
  backtracking: 'backtracking',
  tree: 'tree',
  trees: 'tree',
  design: 'design',
  heap: 'heap',
  matrix: 'matrix',
  math: 'math',
  maths: 'math',
  sort: 'sorting',
  sorting: 'sorting',
  graph: 'graph',
  greedy: 'greedy',
  intervals: 'intervals',
  'linked-list': 'linked-list',
  linkedlist: 'linked-list',
  linkedlists: 'linked-list',
  'binary-search': 'binary-search',
  binarysearch: 'binary-search',
  'bit-manipulation': 'bit-manipulation',
  bitmanipulation: 'bit-manipulation',
  'segment-tree': 'segment-tree',
  segmenttree: 'segment-tree',
  'sliding-window': 'sliding-window',
  slidingwindow: 'sliding-window',
  'two-pointers': 'two-pointers',
  twopointers: 'two-pointers',
  dp: 'dp',
  dynamicprogramming: 'dp',
  'dynamic-programming': 'dp',
  searching: 'searching',
  stack: 'stack',
};

const VALID_TOPICS = new Set(Question.schema.path('topic').enumValues);
const VALID_TYPES = new Set(Question.schema.path('type').enumValues);
const VALID_COMPARISON_MODES = new Set(['exact', 'unorderedDeep', 'longestPalindrome', 'nQueens', 'treeArray']);
const VALID_HARNESSES = new Set(['function', 'tree', 'graph-clone', 'operations', 'codec', 'linked-list']);
const UNORDERED_DEEP_TITLES = new Set([
  '3Sum',
  'Combination Sum',
  'Combination Sum II',
  'Permutations',
  'Subsets',
  'Subsets II',
  'Letter Combinations of Phone Number',
  'Palindrome Partitioning',
  'Generate Parentheses',
  'Group Anagrams',
  'Pacific Atlantic Water Flow',
  'K Closest Points to Origin',
]);
const LINKED_LIST_TITLES = new Set([
  'Reverse Linked List',
  'Merge Two Sorted Lists',
  'Linked List Cycle',
  'Remove Nth Node From End',
  'Reorder List',
  'Add Two Numbers',
  'Palindrome Linked List',
  'Merge K Sorted Lists',
]);
const TREE_ARRAY_TITLES = new Set([
  'Invert Binary Tree',
  'Construct Binary Tree from Preorder and Inorder',
]);

const clampDifficulty = (value) => {
  const parsed = Number.isFinite(value) ? value : parseInt(value, 10);
  if (!parsed || Number.isNaN(parsed)) return 3;
  return Math.max(1, Math.min(5, Math.round(parsed)));
};

const normalizeTopic = (rawTopic) => {
  if (!rawTopic) return 'arrays';
  const key = String(rawTopic).trim().toLowerCase();
  const mapped = TOPIC_MAP[key] || key;
  return VALID_TOPICS.has(mapped) ? mapped : 'arrays';
};

const normalizeType = (rawType) => {
  if (!rawType) return 'coding';
  const value = String(rawType).trim().toLowerCase();
  return VALID_TYPES.has(value) ? value : 'coding';
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const inferComparisonMode = (title) => {
  if (UNORDERED_DEEP_TITLES.has(title)) return 'unorderedDeep';
  if (TREE_ARRAY_TITLES.has(title)) return 'treeArray';
  return 'exact';
};

const inferTestHarness = (title, topic, enrichment, rawTestHarness) => {
  if (VALID_HARNESSES.has(rawTestHarness)) return rawTestHarness;
  if (VALID_HARNESSES.has(enrichment?.testHarness)) return enrichment.testHarness;
  if (LINKED_LIST_TITLES.has(title) || topic === 'linked-list') return 'linked-list';
  if (topic === 'tree') return 'tree';
  return 'function';
};

const normalizeTestCases = (testCases, enrichment, title) => {
  const sourceCases = Array.isArray(enrichment?.testCases) && enrichment.testCases.length
    ? enrichment.testCases
    : testCases;

  if (!Array.isArray(sourceCases) || sourceCases.length === 0) {
    return [
      {
        input: '[]',
        expectedOutput: '[]',
        comparisonMode: 'exact',
        isHidden: false,
        explanation: 'Fallback testcase. Add a real testcase before production use.',
      },
    ];
  }

  return sourceCases
    .map((tc, index) => {
      const input = typeof tc?.input === 'string' ? tc.input : String(tc?.input ?? '');
      const expectedOutput =
        typeof tc?.expectedOutput === 'string'
          ? tc.expectedOutput
          : typeof tc?.output === 'string'
            ? tc.output
            : String(tc?.output ?? '');

      if (!input && !expectedOutput) return null;

      const comparisonMode = VALID_COMPARISON_MODES.has(tc?.comparisonMode)
        ? tc.comparisonMode
        : inferComparisonMode(title);

      return {
        input,
        expectedOutput,
        comparisonMode,
        isHidden: Boolean(tc?.isHidden ?? index > 0),
        explanation: typeof tc?.explanation === 'string' ? tc.explanation : undefined,
      };
    })
    .filter(Boolean);
};

const normalizeStarterCode = (starterCode, title, topic) => {
  if (!starterCode || typeof starterCode !== 'object') {
    return {
      javascript: 'function solve(input) {\n  // Write your solution here\n}',
    };
  }

  const normalized = Object.entries(starterCode).reduce((acc, [language, code]) => {
    if (typeof code === 'string' && code.trim()) {
      acc[language] = code;
    }
    return acc;
  }, {});

  if (topic === 'linked-list' || LINKED_LIST_TITLES.has(title)) {
    const javaStarters = {
      'Reverse Linked List': 'public ListNode reverseList(ListNode head) {\n}',
      'Merge Two Sorted Lists': 'public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n}',
      'Linked List Cycle': 'public boolean hasCycle(ListNode head) {\n}',
      'Remove Nth Node From End': 'public ListNode removeNthFromEnd(ListNode head, int n) {\n}',
      'Reorder List': 'public void reorderList(ListNode head) {\n}',
      'Add Two Numbers': 'public ListNode addTwoNumbers(ListNode l1, ListNode l2) {\n}',
      'Palindrome Linked List': 'public boolean isPalindrome(ListNode head) {\n}',
      'Merge K Sorted Lists': 'public ListNode mergeKLists(ListNode[] lists) {\n}',
    };
    if (javaStarters[title]) normalized.java = javaStarters[title];
  }

  if (topic === 'tree') {
    const javaStarters = {
      'Invert Binary Tree': 'public TreeNode invertTree(TreeNode root) {\n}',
      'Same Tree': 'public boolean isSameTree(TreeNode p, TreeNode q) {\n}',
      'Diameter of Binary Tree': 'public int diameterOfBinaryTree(TreeNode root) {\n}',
      'Balanced Binary Tree': 'public boolean isBalanced(TreeNode root) {\n}',
      'Binary Tree Level Order Traversal': 'public List<List<Integer>> levelOrder(TreeNode root) {\n}',
      'Binary Tree Right Side View': 'public List<Integer> rightSideView(TreeNode root) {\n}',
      'Path Sum': 'public boolean hasPathSum(TreeNode root, int targetSum) {\n}',
      'Construct Binary Tree from Preorder and Inorder': 'public TreeNode buildTree(int[] preorder, int[] inorder) {\n}',
      'Binary Tree Maximum Path Sum': 'public int maxPathSum(TreeNode root) {\n}',
    };
    if (javaStarters[title]) normalized.java = javaStarters[title];
  }

  return normalized;
};

const normalizeQuestion = (raw) => {
  const title = String(raw.title || '').trim();
  const enrichment = QUESTION_ENRICHMENT[title] || {};
  const topic = normalizeTopic(raw.topic);
  const difficulty = clampDifficulty(raw.difficulty);
  const type = normalizeType(raw.type);
  const referenceUrls = Array.from(new Set([
    ...normalizeStringArray(raw.referenceUrls),
    ...normalizeStringArray(enrichment.referenceUrls),
  ]));
  const testHarness = inferTestHarness(title, topic, enrichment, raw.testHarness);

  return {
    title,
    description: String(raw.description || '').trim(),
    topic,
    difficulty,
    type,
    starterCode: normalizeStarterCode(raw.starterCode, title, topic),
    testCases: normalizeTestCases(raw.testCases, enrichment, title),
    constraints: normalizeStringArray(raw.constraints),
    hints: normalizeStringArray(raw.hints),
    solutionApproach: typeof raw.solutionApproach === 'string' ? raw.solutionApproach : '',
    timeComplexity: typeof raw.timeComplexity === 'string' ? raw.timeComplexity : '',
    spaceComplexity: typeof raw.spaceComplexity === 'string' ? raw.spaceComplexity : '',
    expectedKeyPoints: normalizeStringArray(raw.expectedKeyPoints),
    tags: Array.from(new Set(['dsa', topic, ...normalizeStringArray(raw.tags)])),
    estimatedTimeMinutes: Number.isFinite(raw.estimatedTimeMinutes)
      ? Math.max(1, Math.min(120, Math.round(raw.estimatedTimeMinutes)))
      : 20,
    referenceUrls,
    testHarness,
    isActive: raw.isActive !== false,
    source: QUESTION_SOURCE,
  };
};

const getInputPath = () => {
  const argPath = process.argv.find((arg) => !arg.startsWith('--') && arg !== process.argv[0] && arg !== process.argv[1]);
  if (!argPath) return DEFAULT_FILE_PATH;
  return path.resolve(argPath);
};

const shouldReplaceActiveBank = () => process.argv.includes('--replace');

const main = async () => {
  const inputPath = getInputPath();

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(payload)) {
    throw new Error('Input JSON must be an array of questions.');
  }

  await connectDB();

  const summary = {
    total: payload.length,
    inserted: 0,
    updated: 0,
    invalid: 0,
    enriched: 0,
    deactivatedMissing: 0,
  };
  const activeTitles = [];

  for (const raw of payload) {
    const normalized = normalizeQuestion(raw);

    if (!normalized.title || !normalized.description) {
      summary.invalid += 1;
      continue;
    }
    activeTitles.push(normalized.title);

    if (QUESTION_ENRICHMENT[normalized.title]) {
      summary.enriched += 1;
    }

    const existing = await Question.findOne({
      title: normalized.title,
      source: QUESTION_SOURCE,
    });

    if (!existing) {
      await Question.create(normalized);
      summary.inserted += 1;
      continue;
    }

    await Question.updateOne(
      { _id: existing._id },
      {
        $set: {
          ...normalized,
          updatedAt: new Date(),
        },
      }
    );
    summary.updated += 1;
  }

  if (shouldReplaceActiveBank()) {
    const deactivateResult = await Question.updateMany(
      {
        source: QUESTION_SOURCE,
        title: { $nin: activeTitles },
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      }
    );
    summary.deactivatedMissing = deactivateResult.modifiedCount || 0;
  }

  console.log(JSON.stringify(summary, null, 2));
};

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Import failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
