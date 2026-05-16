const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      required: true,
      index: true,
      enum: [
        'arrays', 'string', 'searching', 'stack', 'dp', 'graph',
        'heap', 'matrix', 'hashing', 'hash-tables', 'backtracking',
        'tree', 'design', 'binary-search', 'bit-manipulation',
        'greedy', 'intervals', 'linked-list', 'segment-tree',
        'sliding-window', 'two-pointers', 'math', 'sorting',
      ],
    },
    difficulty: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    type: {
      type: String,
      enum: ['coding', 'conceptual', 'behavioral', 'system-design'],
      default: 'coding',
    },
    // For coding questions
    starterCode: {
      type: Map,
      of: String, // language -> starter code
      default: {},
    },
    testCases: [
      {
        input: { type: String, required: true },
        expectedOutput: { type: String, required: true },
        comparisonMode: {
          type: String,
          enum: ['exact', 'unorderedDeep', 'longestPalindrome', 'nQueens', 'treeArray'],
          default: 'exact',
        },
        isHidden: { type: Boolean, default: false },
        explanation: String,
      },
    ],
    constraints: [String],
    hints: [String],
    // Expected solution details
    solutionApproach: String,
    timeComplexity: String,
    spaceComplexity: String,
    referenceUrls: [String],
    testHarness: {
      type: String,
      enum: ['function', 'tree', 'graph-clone', 'operations', 'codec', 'linked-list'],
      default: 'function',
    },
    canonicalSolutions: {
      type: Map,
      of: String,
      default: {},
    },
    // For conceptual/behavioral questions
    expectedKeyPoints: [String],
    rubric: {
      type: Map,
      of: Number, // criteria -> max points
      default: {},
    },
    // Metadata
    tags: [String],
    estimatedTimeMinutes: { type: Number, default: 15 },
    // Stats from usage
    timesAsked: { type: Number, default: 0 },
    avgAcceptanceRate: { type: Number, default: 0 },
    avgTimeToSolveMs: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    source: {
      type: String,
      enum: ['manual', 'ai-generated', 'imported', 'leetcode-style'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
questionSchema.index({ topic: 1, difficulty: 1 });
questionSchema.index({ type: 1, difficulty: 1 });
questionSchema.index({ tags: 1 });

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
