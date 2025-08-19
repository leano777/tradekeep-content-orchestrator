const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { restrictTo, logActivity } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

// Get all content items with filtering, sorting, pagination
router.get('/', catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    platform,
    type,
    brandPillar,
    authorId,
    assignedToId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {};

  // Build filter conditions
  if (status) where.status = status;
  if (platform) where.platform = platform;
  if (type) where.type = type;
  if (brandPillar) where.brandPillar = brandPillar;
  if (authorId) where.authorId = authorId;
  if (assignedToId) where.assignedToId = assignedToId;
  
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [contentItems, total] = await Promise.all([
    prisma.contentItem.findMany({
      where,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        },
        assets: {
          include: {
            asset: {
              select: { id: true, fileName: true, filePath: true, mimeType: true }
            }
          }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: parseInt(limit)
    }),
    prisma.contentItem.count({ where })
  ]);

  res.status(200).json({
    status: 'success',
    results: contentItems.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: {
      contentItems
    }
  });
}));

// Create new content item
router.post('/', [
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('type').isIn(['SOCIAL_POST', 'EMAIL', 'BLOG_POST', 'VIDEO_SCRIPT', 'CAROUSEL', 'STORY', 'REEL', 'THREAD']).withMessage('Invalid content type'),
  body('platform').isIn(['INSTAGRAM', 'TWITTER', 'LINKEDIN', 'EMAIL', 'BLOG', 'YOUTUBE', 'TIKTOK']).withMessage('Invalid platform'),
  body('contentFormat').isIn(['TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL', 'STORY', 'REEL', 'THREAD', 'EMAIL_TEMPLATE', 'BLOG_ARTICLE']).withMessage('Invalid content format')
], catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'fail',
      errors: errors.array()
    });
  }

  const contentItem = await prisma.contentItem.create({
    data: {
      ...req.body,
      authorId: req.user.id
    },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, avatar: true }
      },
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, avatar: true }
      }
    }
  });

  await logActivity(req.user.id, 'CONTENT_CREATED', 'content', contentItem.id, { title: contentItem.title }, req);

  res.status(201).json({
    status: 'success',
    data: {
      contentItem
    }
  });
}));

// Get single content item
router.get('/:id', catchAsync(async (req, res, next) => {
  const contentItem = await prisma.contentItem.findUnique({
    where: { id: req.params.id },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, avatar: true }
      },
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, avatar: true }
      },
      assets: {
        include: {
          asset: true
        },
        orderBy: { order: 'asc' }
      },
      comments: {
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          },
          replies: {
            include: {
              author: {
                select: { id: true, firstName: true, lastName: true, avatar: true }
              }
            }
          }
        },
        where: { parentId: null },
        orderBy: { createdAt: 'desc' }
      },
      versions: {
        select: { id: true, version: true, createdAt: true, status: true },
        orderBy: { version: 'desc' }
      }
    }
  });

  if (!contentItem) {
    return next(new AppError('Content item not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      contentItem
    }
  });
}));

// Update content item
router.patch('/:id', catchAsync(async (req, res, next) => {
  const contentItem = await prisma.contentItem.findUnique({
    where: { id: req.params.id }
  });

  if (!contentItem) {
    return next(new AppError('Content item not found', 404));
  }

  // Check permissions - authors and assigned users can edit, or managers/admins
  const canEdit = contentItem.authorId === req.user.id || 
                  contentItem.assignedToId === req.user.id ||
                  ['ADMIN', 'MANAGER'].includes(req.user.role);

  if (!canEdit) {
    return next(new AppError('You do not have permission to edit this content', 403));
  }

  const updatedContentItem = await prisma.contentItem.update({
    where: { id: req.params.id },
    data: req.body,
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, avatar: true }
      },
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, avatar: true }
      }
    }
  });

  await logActivity(req.user.id, 'CONTENT_UPDATED', 'content', contentItem.id, req.body, req);

  res.status(200).json({
    status: 'success',
    data: {
      contentItem: updatedContentItem
    }
  });
}));

// Delete content item
router.delete('/:id', restrictTo('ADMIN', 'MANAGER'), catchAsync(async (req, res, next) => {
  const contentItem = await prisma.contentItem.findUnique({
    where: { id: req.params.id }
  });

  if (!contentItem) {
    return next(new AppError('Content item not found', 404));
  }

  await prisma.contentItem.delete({
    where: { id: req.params.id }
  });

  await logActivity(req.user.id, 'CONTENT_DELETED', 'content', req.params.id, { title: contentItem.title }, req);

  res.status(204).json({
    status: 'success',
    data: null
  });
}));

module.exports = router;