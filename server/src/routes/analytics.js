const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protect, restrictTo } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

// Get content analytics
router.get('/content', protect, catchAsync(async (req, res) => {
  const { startDate, endDate, platform, contentId, period = '30d' } = req.query;
  
  // Calculate date range
  const now = new Date();
  let dateFilter = {};
  
  if (startDate && endDate) {
    dateFilter = {
      metricDate: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };
  } else {
    // Default to last 30 days
    const daysAgo = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    dateFilter = {
      metricDate: {
        gte: new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000))
      }
    };
  }

  const where = { ...dateFilter };
  if (platform) where.platform = platform;
  if (contentId) where.contentId = contentId;

  const analytics = await prisma.contentAnalytics.findMany({
    where,
    include: {
      content: {
        select: { 
          id: true, 
          title: true, 
          type: true, 
          platform: true,
          status: true,
          publishedAt: true,
          pillar: true
        }
      }
    },
    orderBy: { metricDate: 'desc' }
  });

  // Aggregate metrics
  const totalMetrics = analytics.reduce((acc, item) => {
    acc.totalViews += item.views;
    acc.totalLikes += item.likes;
    acc.totalShares += item.shares;
    acc.totalComments += item.comments;
    acc.totalClicks += item.clicks;
    acc.totalReach += item.reach || 0;
    acc.totalImpressions += item.impressions || 0;
    return acc;
  }, {
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0,
    totalComments: 0,
    totalClicks: 0,
    totalReach: 0,
    totalImpressions: 0
  });

  // Platform breakdown
  const platformStats = analytics.reduce((acc, item) => {
    if (!acc[item.platform]) {
      acc[item.platform] = {
        views: 0,
        engagements: 0,
        reach: 0,
        contentCount: new Set()
      };
    }
    acc[item.platform].views += item.views;
    acc[item.platform].engagements += (item.likes + item.shares + item.comments);
    acc[item.platform].reach += item.reach || 0;
    acc[item.platform].contentCount.add(item.contentId);
    return acc;
  }, {});

  // Convert Set to count
  Object.keys(platformStats).forEach(platform => {
    platformStats[platform].contentCount = platformStats[platform].contentCount.size;
  });

  res.status(200).json({
    status: 'success',
    data: { 
      analytics,
      summary: {
        ...totalMetrics,
        totalEngagements: totalMetrics.totalLikes + totalMetrics.totalShares + totalMetrics.totalComments,
        platformStats,
        period: period,
        contentCount: analytics.length
      }
    }
  });
}));

// Get dashboard metrics
router.get('/dashboard', protect, catchAsync(async (req, res) => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const lastWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

  // Content metrics
  const [totalContent, publishedContent, draftContent, scheduledContent] = await Promise.all([
    prisma.content.count(),
    prisma.content.count({ where: { status: 'published' } }),
    prisma.content.count({ where: { status: 'draft' } }),
    prisma.content.count({ where: { status: 'scheduled' } })
  ]);

  // Content by platform (last month)
  const contentByPlatform = await prisma.content.groupBy({
    by: ['platform'],
    _count: { platform: true },
    where: {
      createdAt: { gte: lastMonth },
      platform: { not: null }
    }
  });

  // Content by status
  const contentByStatus = await prisma.content.groupBy({
    by: ['status'],
    _count: { status: true }
  });

  // Content by pillar
  const contentByPillar = await prisma.content.groupBy({
    by: ['pillar'],
    _count: { pillar: true },
    where: {
      createdAt: { gte: lastMonth }
    }
  });

  // Recent analytics performance
  const recentAnalytics = await prisma.contentAnalytics.aggregate({
    _sum: {
      views: true,
      likes: true,
      shares: true,
      comments: true,
      clicks: true,
      reach: true,
      impressions: true
    },
    where: {
      metricDate: { gte: lastWeek }
    }
  });

  // Growth metrics - compare last week to previous week
  const previousWeek = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
  const previousWeekAnalytics = await prisma.contentAnalytics.aggregate({
    _sum: {
      views: true,
      likes: true,
      shares: true,
      comments: true
    },
    where: {
      metricDate: {
        gte: previousWeek,
        lt: lastWeek
      }
    }
  });

  // Calculate growth percentages
  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const growth = {
    views: calculateGrowth(
      recentAnalytics._sum.views || 0,
      previousWeekAnalytics._sum.views || 0
    ),
    engagements: calculateGrowth(
      (recentAnalytics._sum.likes || 0) + (recentAnalytics._sum.shares || 0) + (recentAnalytics._sum.comments || 0),
      (previousWeekAnalytics._sum.likes || 0) + (previousWeekAnalytics._sum.shares || 0) + (previousWeekAnalytics._sum.comments || 0)
    )
  };

  // Top performing content (last month)
  const topContent = await prisma.content.findMany({
    where: {
      createdAt: { gte: lastMonth },
      status: 'published'
    },
    include: {
      analytics: {
        select: {
          views: true,
          likes: true,
          shares: true,
          comments: true
        }
      }
    },
    take: 5
  });

  // Calculate total engagement for each content
  const topContentWithEngagement = topContent.map(content => {
    const totalEngagement = content.analytics.reduce((sum, analytics) => {
      return sum + analytics.views + analytics.likes + analytics.shares + analytics.comments;
    }, 0);
    
    return {
      ...content,
      totalEngagement,
      analytics: undefined // Remove analytics array to keep response clean
    };
  }).sort((a, b) => b.totalEngagement - a.totalEngagement);

  res.status(200).json({
    status: 'success',
    data: {
      overview: {
        totalContent,
        publishedContent,
        draftContent,
        scheduledContent
      },
      performance: {
        weeklyViews: recentAnalytics._sum.views || 0,
        weeklyEngagements: (recentAnalytics._sum.likes || 0) + (recentAnalytics._sum.shares || 0) + (recentAnalytics._sum.comments || 0),
        weeklyReach: recentAnalytics._sum.reach || 0,
        weeklyImpressions: recentAnalytics._sum.impressions || 0,
        growth
      },
      breakdowns: {
        contentByPlatform: contentByPlatform.map(item => ({
          platform: item.platform || 'unspecified',
          count: item._count.platform
        })),
        contentByStatus: contentByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        contentByPillar: contentByPillar.map(item => ({
          pillar: item.pillar,
          count: item._count.pillar
        }))
      },
      topContent: topContentWithEngagement
    }
  });
}));

// Record content analytics (for external integrations)
router.post('/content/:contentId/metrics', protect, catchAsync(async (req, res) => {
  const { contentId } = req.params;
  const {
    platform,
    views = 0,
    likes = 0,
    shares = 0,
    comments = 0,
    clicks = 0,
    reach,
    impressions,
    source = 'manual'
  } = req.body;

  // Verify content exists
  const content = await prisma.content.findUnique({
    where: { id: contentId }
  });

  if (!content) {
    return res.status(404).json({
      status: 'error',
      message: 'Content not found'
    });
  }

  // Create or update analytics record
  const analytics = await prisma.contentAnalytics.create({
    data: {
      contentId,
      platform,
      views,
      likes,
      shares,
      comments,
      clicks,
      reach,
      impressions,
      source,
      clickThroughRate: clicks > 0 && impressions > 0 ? (clicks / impressions) * 100 : null,
      engagementRate: impressions > 0 ? ((likes + shares + comments) / impressions) * 100 : null
    }
  });

  res.status(201).json({
    status: 'success',
    data: { analytics }
  });
}));

// Get analytics for specific content
router.get('/content/:contentId', protect, catchAsync(async (req, res) => {
  const { contentId } = req.params;
  const { platform } = req.query;

  const where = { contentId };
  if (platform) where.platform = platform;

  const analytics = await prisma.contentAnalytics.findMany({
    where,
    include: {
      content: {
        select: { 
          id: true, 
          title: true, 
          type: true, 
          platform: true,
          status: true,
          publishedAt: true
        }
      }
    },
    orderBy: { metricDate: 'desc' }
  });

  // Calculate summary metrics
  const summary = analytics.reduce((acc, item) => {
    acc.totalViews += item.views;
    acc.totalLikes += item.likes;
    acc.totalShares += item.shares;
    acc.totalComments += item.comments;
    acc.totalClicks += item.clicks;
    if (item.reach) acc.totalReach += item.reach;
    if (item.impressions) acc.totalImpressions += item.impressions;
    return acc;
  }, {
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0,
    totalComments: 0,
    totalClicks: 0,
    totalReach: 0,
    totalImpressions: 0
  });

  summary.totalEngagements = summary.totalLikes + summary.totalShares + summary.totalComments;

  res.status(200).json({
    status: 'success',
    data: { 
      analytics,
      summary,
      content: analytics.length > 0 ? analytics[0].content : null
    }
  });
}));

// Track user engagement
router.post('/engagement', protect, catchAsync(async (req, res) => {
  const {
    action,
    entityType,
    entityId,
    platform,
    source,
    sessionId,
    duration
  } = req.body;

  const engagement = await prisma.userEngagement.create({
    data: {
      userId: req.user.id,
      action,
      entityType,
      entityId,
      platform,
      source,
      sessionId,
      duration,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    }
  });

  res.status(201).json({
    status: 'success',
    data: { engagement }
  });
}));

module.exports = router;