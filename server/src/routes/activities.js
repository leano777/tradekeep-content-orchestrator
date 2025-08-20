const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get activities
router.get('/', protect, async (req, res) => {
  try {
    const { contentId, limit = 20 } = req.query;

    const where = contentId ? { contentId } : {};

    const activities = await prisma.activity.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit)
    });

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Track activity
router.post('/', protect, async (req, res) => {
  try {
    const { type, contentId, details } = req.body;

    const activity = await prisma.activity.create({
      data: {
        type,
        userId: req.user.id,
        contentId,
        details: details ? JSON.stringify(details) : null
      },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    res.json(activity);
  } catch (error) {
    console.error('Error tracking activity:', error);
    res.status(500).json({ error: 'Failed to track activity' });
  }
});

module.exports = router;