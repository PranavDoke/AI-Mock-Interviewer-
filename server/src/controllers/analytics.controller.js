const catchAsync = require('../utils/catchAsync');
const { successResponse } = require('../utils/response');
const { analyticsService } = require('../services');

const getDashboard = catchAsync(async (req, res) => {
  const analytics = await analyticsService.getDashboardAnalytics(
    req.user._id,
    req.query.period
  );
  successResponse(res, analytics);
});

const getTopicAnalytics = catchAsync(async (req, res) => {
  const analytics = await analyticsService.getTopicAnalytics(
    req.user._id,
    req.query.topic,
    req.query.period
  );
  successResponse(res, analytics);
});

module.exports = {
  getDashboard,
  getTopicAnalytics,
};
