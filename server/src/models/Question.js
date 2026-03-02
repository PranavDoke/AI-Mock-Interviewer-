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
        'arrays', 'strings', 'linked-lists', 'trees', 'graphs',
        'dynamic-programming', 'sorting', 'searching', 'recursion',
        'stacks-queues', 'hash-tables', 'greedy', 'backtracking',
        'bit-manipulation', 'math', 'system-design', 'oop',
        'databases', 'networking', 'os-concepts',
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
      enum: ['manual', 'ai-generated', 'imported'],
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
