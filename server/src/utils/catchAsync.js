/**
 * Wraps an async express route handler to catch errors
 * and pass them to the Express error handler.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

module.exports = catchAsync;
