const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  // User's code submission
  code: { type: String, default: '' },
  language: {
    type: String,
    enum: ['javascript', 'python', 'cpp', 'java', 'c'],
    default: 'javascript',
  },
  // User's explanation/answer for conceptual questions
  explanation: { type: String, default: '' },
  // Code execution results
  executionResult: {
    stdout: String,
    stderr: String,
    exitCode: Number,
    executionTimeMs: Number,
    memoryUsedKb: Number,
    timedOut: { type: Boolean, default: false },
  },
  // Test case results
  testResults: [
    {
      input: String,
      expectedOutput: String,
      actualOutput: String,
      passed: Boolean,
      executionTimeMs: Number,
    },
  ],
  // AI evaluation scores
  evaluation: {
    codeCorrectness: { type: Number, min: 0, max: 100, default: 0 },
    codeQuality: { type: Number, min: 0, max: 100, default: 0 },
    explanationClarity: { type: Number, min: 0, max: 100, default: 0 },
    reasoningDepth: { type: Number, min: 0, max: 100, default: 0 },
    structuredThinking: { type: Number, min: 0, max: 100, default: 0 },
    overallScore: { type: Number, min: 0, max: 100, default: 0 },
    feedback: String,
    strengths: [String],
    improvements: [String],
  },
  // Timing
  startedAt: { type: Date, required: true },
  submittedAt: { type: Date, required: true },
  timeSpentMs: { type: Number, default: 0 },
});

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Session configuration
    config: {
      type: {
        type: String,
        enum: ['technical', 'behavioral', 'system-design', 'mixed'],
        default: 'technical',
      },
      topics: [String],
      targetDifficulty: { type: Number, min: 1, max: 5, default: 3 },
      language: {
        type: String,
        enum: ['javascript', 'python', 'cpp', 'java', 'c'],
        default: 'javascript',
      },
      maxQuestions: { type: Number, default: 5 },
      timeLimitMinutes: { type: Number, default: 30 },
    },
    // Session state
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned', 'paused'],
      default: 'active',
      index: true,
    },
    currentQuestionIndex: { type: Number, default: 0 },
    // Adaptive difficulty tracking within the session
    difficultyProgression: [
      {
        questionIndex: Number,
        difficulty: Number,
        topic: String,
        score: Number,
      },
    ],
    // All submissions in this session
    submissions: [submissionSchema],
    // Session-level scores
    scores: {
      overall: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      avgTimePerQuestion: { type: Number, default: 0 },
      difficultyHandled: { type: Number, default: 0 },
      consistency: { type: Number, default: 0 },
      topicScores: {
        type: Map,
        of: Number,
        default: {},
      },
    },
    // AI-generated session summary
    summary: {
      overallFeedback: String,
      strengths: [String],
      weaknesses: [String],
      recommendations: [String],
      nextSteps: [String],
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ userId: 1, status: 1 });

// Virtual for duration
interviewSessionSchema.virtual('durationMs').get(function () {
  if (this.completedAt && this.startedAt) {
    return this.completedAt.getTime() - this.startedAt.getTime();
  }
  return Date.now() - this.startedAt.getTime();
});

const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);

module.exports = InterviewSession;
