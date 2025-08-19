const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { restrictTo, logActivity } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

// Get all campaigns
router.get('/', catchAsync(async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {};

  if (status) where.status = status;
  if (type) where.type = type;

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        },
        _count: {
          select: { content: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.campaign.count({ where })
  ]);

  res.status(200).json({
    status: 'success',
    results: campaigns.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { campaigns }
  });
}));

// Create new campaign
router.post('/', restrictTo('ADMIN', 'MANAGER', 'EDITOR'), catchAsync(async (req, res) => {
  const campaign = await prisma.campaign.create({
    data: {
      ...req.body,
      createdById: req.user.id
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, avatar: true }
      }
    }
  });

  await logActivity(req.user.id, 'CAMPAIGN_CREATED', 'campaign', campaign.id, { name: campaign.name }, req);

  res.status(201).json({
    status: 'success',
    data: { campaign }
  });
}));

module.exports = router;