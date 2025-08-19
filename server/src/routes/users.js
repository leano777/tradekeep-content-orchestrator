const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { restrictTo, logActivity } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

// Get all users (Admin/Manager only)
router.get('/', restrictTo('ADMIN', 'MANAGER'), catchAsync(async (req, res) => {
  const users = await prisma.user.findMany({
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
      _count: {
        select: {
          contentItems: true,
          assignedContent: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
}));

// Get user by ID
router.get('/:id', restrictTo('ADMIN', 'MANAGER'), catchAsync(async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
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

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
}));

// Update user role (Admin only)
router.patch('/:id/role', restrictTo('ADMIN'), catchAsync(async (req, res, next) => {
  const { role } = req.body;
  
  if (!['ADMIN', 'MANAGER', 'EDITOR', 'VIEWER'].includes(role)) {
    return next(new AppError('Invalid role', 400));
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true,
      isActive: true
    }
  });

  await logActivity(req.user.id, 'USER_ROLE_UPDATED', 'user', req.params.id, { newRole: role }, req);

  res.status(200).json({
    status: 'success',
    data: { user }
  });
}));

module.exports = router;