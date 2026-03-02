const catchAsync = require('../utils/catchAsync');
const { successResponse } = require('../utils/response');
const { executionService } = require('../services');

const executeCode = catchAsync(async (req, res) => {
  const { code, language, input } = req.body;
  const result = await executionService.executeCode(code, language, input);
  successResponse(res, result, 'Code executed successfully.');
});

const getRuntimes = catchAsync(async (req, res) => {
  const runtimes = await executionService.getRuntimes();
  successResponse(res, { runtimes });
});

const healthCheck = catchAsync(async (req, res) => {
  const health = await executionService.healthCheck();
  successResponse(res, health);
});

module.exports = {
  executeCode,
  getRuntimes,
  healthCheck,
};
