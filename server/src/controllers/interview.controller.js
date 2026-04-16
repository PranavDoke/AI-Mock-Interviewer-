const catchAsync = require('../utils/catchAsync');
const { successResponse, paginatedResponse } = require('../utils/response');
const { interviewService } = require('../services');

const startSession = catchAsync(async (req, res) => {
  const result = await interviewService.startSession(req.user._id, req.body);
  successResponse(res, result, 'Interview session started.', 201);
});

const getNextQuestion = catchAsync(async (req, res) => {
  const result = await interviewService.getNextQuestion(req.params.sessionId, req.user._id);
  successResponse(res, result);
});

const submitAnswer = catchAsync(async (req, res) => {
  const result = await interviewService.submitAnswer(
    req.params.sessionId,
    req.user._id,
    req.body
  );
  successResponse(res, result, 'Answer submitted successfully.');
});

const abandonSession = catchAsync(async (req, res) => {
  const session = await interviewService.abandonSession(req.params.sessionId, req.user._id);
  successResponse(res, { session }, 'Session abandoned.');
});

const getSession = catchAsync(async (req, res) => {
  const session = await interviewService.getSession(req.params.sessionId, req.user._id);
  successResponse(res, { session });
});

const listSessions = catchAsync(async (req, res) => {
  const { sessions, total, page, limit } = await interviewService.listSessions(
    req.user._id,
    req.query
  );
  paginatedResponse(res, sessions, page, limit, total);
});

module.exports = {
  startSession,
  getNextQuestion,
  submitAnswer,
  abandonSession,
  getSession,
  listSessions,
};
