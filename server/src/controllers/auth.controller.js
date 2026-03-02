const catchAsync = require('../utils/catchAsync');
const { successResponse } = require('../utils/response');
const { authService } = require('../services');

const register = catchAsync(async (req, res) => {
  const { user, tokens } = await authService.register(req.body);

  // Set cookies
  setTokenCookies(res, tokens);

  successResponse(res, { user, tokens }, 'Registration successful.', 201);
});

const login = catchAsync(async (req, res) => {
  const { user, tokens } = await authService.login(req.body);

  setTokenCookies(res, tokens);

  successResponse(res, { user, tokens }, 'Login successful.');
});

const logout = catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  await authService.logout(refreshToken);

  // Clear cookies
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  successResponse(res, null, 'Logged out successfully.');
});

const refreshTokens = catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const { user, tokens } = await authService.refreshAuth(refreshToken);

  setTokenCookies(res, tokens);

  successResponse(res, { user, tokens }, 'Tokens refreshed.');
});

const getMe = catchAsync(async (req, res) => {
  successResponse(res, { user: req.user });
});

const changePassword = catchAsync(async (req, res) => {
  const tokens = await authService.changePassword(
    req.user._id,
    req.body.currentPassword,
    req.body.newPassword
  );

  setTokenCookies(res, tokens);

  successResponse(res, { tokens }, 'Password changed successfully.');
});

// Helper to set httpOnly cookies
function setTokenCookies(res, tokens) {
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 30 * 60 * 1000, // 30 minutes
  });

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  getMe,
  changePassword,
};
