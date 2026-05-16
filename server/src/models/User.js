const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      sparse: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: '',
    },
    // Skill profile for adaptive difficulty
    skillProfile: {
      overall: { type: Number, default: 3, min: 1, max: 5 },
      topics: {
        type: Map,
        of: {
          level: { type: Number, default: 3, min: 1, max: 5 },
          questionsAttempted: { type: Number, default: 0 },
          correctAnswers: { type: Number, default: 0 },
          avgTimeMs: { type: Number, default: 0 },
        },
        default: {},
      },
    },
    // Interview stats
    stats: {
      totalInterviews: { type: Number, default: 0 },
      totalQuestions: { type: Number, default: 0 },
      avgScore: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastInterviewAt: { type: Date },
    },
    preferences: {
      preferredLanguage: {
        type: String,
        enum: ['javascript', 'python', 'cpp', 'java', 'c'],
        default: 'javascript',
      },
      preferredTopics: [String],
      interviewDuration: { type: Number, default: 30 }, // minutes
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for efficient queries (email index is already created via unique:true in schema)
userSchema.index({ 'stats.avgScore': -1 });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
