const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { restrictTo } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

// Get content analytics
router.get('/content', catchAsync(async (req, res) => {
  const { startDate, endDate, platform, contentId } = req.query;
  const where = {};

  if (startDate && endDate) {
    where.timestamp = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };
  }
  if (platform) where.platform = platform;
  if (contentId) where.contentId = contentId;

  const analytics = await prisma.analytics.findMany({
    where,
    include: {
      content: {
        select: { id: true, title: true, type: true, platform: true }
      }
    },
    orderBy: { timestamp: 'desc' }
  });

  res.status(200).json({
    status: 'success',
    data: { analytics }
  });
}));

// Get dashboard metrics
router.get('/dashboard', catchAsync(async (req, res) => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  const [totalContent, publishedContent, draftContent, scheduledContent] = await Promise.all([
    prisma.contentItem.count(),
    prisma.contentItem.count({ where: { status: 'PUBLISHED' } }),
    prisma.contentItem.count({ where: { status: 'DRAFT' } }),
    prisma.contentItem.count({ where: { status: 'SCHEDULED' } })
  ]);

  const contentByPlatform = await prisma.contentItem.groupBy({
    by: ['platform'],
    _count: { platform: true },
    where: {
      createdAt: { gte: lastMonth }
    }
  });

  const contentByStatus = await prisma.contentItem.groupBy({
    by: ['status'],
    _count: { status: true }
  });

  res.status(200).json({
    status: 'success',
    data: {
      totals: {
        totalContent,
        publishedContent,
        draftContent,
        scheduledContent
      },
      contentByPlatform,
      contentByStatus
    }
  });
}));

module.exports = router;