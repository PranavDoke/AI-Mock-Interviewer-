const catchAsync = require('../utils/catchAsync');
const { successResponse } = require('../utils/response');
const { userService } = require('../services');

const getProfile = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.user._id);
  successResponse(res, { user });
});

const updateProfile = catchAsync(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  successResponse(res, { user }, 'Profile updated successfully.');
});

const getSkillProfile = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.user._id);
  successResponse(res, {
    skillProfile: user.skillProfile,
    stats: user.stats,
  });
});

module.exports = {
  getProfile,
  updateProfile,
  getSkillProfile,
};
