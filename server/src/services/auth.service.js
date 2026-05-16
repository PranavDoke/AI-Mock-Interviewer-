const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User, Token } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Generate access and refresh tokens for a user.
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { sub: userId },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiration }
  );

  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiration }
  );

  return { accessToken, refreshToken };
};

/**
 * Save refresh token to database.
 */
const saveRefreshToken = async (token, userId) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await Token.create({
    token,
    userId,
    type: 'refresh',
    expires: expiresAt,
  });
};

/**
 * Register a new user.
 */
const register = async ({ name, email, password }) => {
  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(409, 'Email already registered.');
  }

  try {
    // Create user
    const user = await User.create({ name, email: email.toLowerCase(), password });

    // Generate tokens
    const tokens = generateTokens(user._id);
    await saveRefreshToken(tokens.refreshToken, user._id);

    return { user, tokens };
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000 && error.keyPattern?.email) {
      throw new ApiError(409, 'Email already registered.');
    }
    throw error;
  }
};

/**
 * Login with email and password.
 */
const login = async ({ email, password }) => {
  // Find user with password field - normalize email to lowercase
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account has been deactivated.');
  }

  // Generate tokens
  const tokens = generateTokens(user._id);
  await saveRefreshToken(tokens.refreshToken, user._id);

  // Remove password from response
  user.password = undefined;

  return { user, tokens };
};

/**
 * Refresh access token using refresh token.
 */
const refreshAuth = async (refreshToken) => {
  try {
    // Verify token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

    // Check token in DB
    const tokenDoc = await Token.findOne({
      token: refreshToken,
      userId: decoded.sub,
      type: 'refresh',
      blacklisted: false,
    });

    if (!tokenDoc) {
      throw new ApiError(401, 'Invalid refresh token.');
    }

    // Check user exists
    const user = await User.findById(decoded.sub);
    if (!user) {
      throw new ApiError(401, 'User not found.');
    }

    // Rotate: blacklist old token, generate new pair
    await Token.deleteOne({ _id: tokenDoc._id });

    const tokens = generateTokens(user._id);
    await saveRefreshToken(tokens.refreshToken, user._id);

    return { user, tokens };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'Invalid refresh token.');
  }
};

/**
 * Logout — blacklist refresh token.
 */
const logout = async (refreshToken) => {
  const tokenDoc = await Token.findOne({ token: refreshToken, type: 'refresh' });
  if (tokenDoc) {
    await Token.deleteOne({ _id: tokenDoc._id });
  }
};

/**
 * Change user password.
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect.');
  }

  user.password = newPassword;
  await user.save();

  // Invalidate all refresh tokens
  await Token.deleteMany({ userId, type: 'refresh' });

  const tokens = generateTokens(user._id);
  await saveRefreshToken(tokens.refreshToken, user._id);

  return tokens;
};

module.exports = {
  register,
  login,
  refreshAuth,
  logout,
  changePassword,
  generateTokens,
};
