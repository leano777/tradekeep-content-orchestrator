const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const { 
  createSendToken, 
  protect, 
  hashPassword, 
  comparePassword, 
  logActivity 
} = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 signups per hour
  message: 'Too many accounts created from this IP, please try again after an hour.',
});

// Validation middleware
const validateSignup = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  body('firstName')
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('Last name is required and must be less than 50 characters'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Helper function to check validation results
const checkValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
router.post('/register', signupLimiter, validateSignup, checkValidationResult, catchAsync(async (req, res, next) => {
  const { email, username, firstName, lastName, password } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { username }
      ]
    }
  });

  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username';
    return next(new AppError(`User with this ${field} already exists`, 409));
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const newUser = await prisma.user.create({
    data: {
      email,
      username,
      firstName,
      lastName,
      password: hashedPassword,
      role: 'EDITOR' // Default role
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true,
      isActive: true,
      emailVerified: true,
      createdAt: true
    }
  });

  // Log activity
  await logActivity(newUser.id, 'USER_REGISTERED', 'user', newUser.id, { email, username }, req);

  // Send token
  createSendToken(newUser, 201, req, res);
}));

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
router.post('/login', authLimiter, validateLogin, checkValidationResult, catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if user exists and password is correct
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !(await comparePassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 401));
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  // Log activity
  await logActivity(user.id, 'USER_LOGIN', 'user', user.id, { email }, req);

  // Remove password from output
  const userWithoutPassword = {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatar: user.avatar,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  // Send token
  createSendToken(userWithoutPassword, 200, req, res);
}));

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
router.post('/logout', protect, catchAsync(async (req, res, next) => {
  // Log activity
  await logActivity(req.user.id, 'USER_LOGOUT', 'user', req.user.id, null, req);

  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ 
    status: 'success',
    message: 'Logged out successfully'
  });
}));

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
router.get('/me', protect, catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true,
      isActive: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      userPreferences: {
        select: {
          key: true,
          value: true
        }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
}));

// @desc    Update current user
// @route   PATCH /api/v1/auth/me
// @access  Private
router.patch('/me', protect, [
  body('firstName').optional().isLength({ min: 1, max: 50 }).trim(),
  body('lastName').optional().isLength({ min: 1, max: 50 }).trim(),
  body('username').optional().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('avatar').optional().isURL()
], checkValidationResult, catchAsync(async (req, res, next) => {
  const allowedFields = ['firstName', 'lastName', 'username', 'avatar'];
  const updates = {};

  // Filter allowed fields
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No valid fields provided for update', 400));
  }

  // Check if username is already taken (if being updated)
  if (updates.username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username: updates.username,
        NOT: { id: req.user.id }
      }
    });

    if (existingUser) {
      return next(new AppError('Username already taken', 409));
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: updates,
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true,
      isActive: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true
    }
  });

  // Log activity
  await logActivity(req.user.id, 'USER_PROFILE_UPDATED', 'user', req.user.id, updates, req);

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
}));

// @desc    Change password
// @route   PATCH /api/v1/auth/change-password
// @access  Private
router.patch('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must be at least 8 characters and contain uppercase, lowercase, number, and special character')
], checkValidationResult, catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  // Check current password
  if (!(await comparePassword(currentPassword, user.password))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword }
  });

  // Log activity
  await logActivity(req.user.id, 'PASSWORD_CHANGED', 'user', req.user.id, null, req);

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully'
  });
}));

// @desc    Verify token
// @route   GET /api/v1/auth/verify
// @access  Private
router.get('/verify', protect, (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
      valid: true
    }
  });
});

module.exports = router;