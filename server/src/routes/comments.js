const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get comments for content
router.get('/content/:contentId/comments', protect, async (req, res) => {
  try {
    const { contentId } = req.params;

    const comments = await prisma.comment.findMany({
      where: {
        contentId,
        parentId: null
      },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        replies: {
          include: {
            user: {
              select: { id: true, email: true, name: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get all comments for a user
router.get('/comments', protect, async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        content: {
          select: { id: true, title: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    res.json(comments);
  } catch (error) {
    console.error('Error fetching user comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Delete comment
router.delete('/comments/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the comment
    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    await prisma.comment.delete({
      where: { id }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;