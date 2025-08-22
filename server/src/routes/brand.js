const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protect, restrictTo } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

// Multer configuration for brand asset uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/brand/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|svg|ai|psd|sketch/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new AppError('Invalid file type for brand assets', 400));
    }
  }
});

// Brand Profile Routes
router.get('/profiles', protect, catchAsync(async (req, res) => {
  const profiles = await prisma.brandProfile.findMany({
    include: {
      contentPillars: true,
      brandAssets: {
        where: { isLatest: true },
        take: 5
      },
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  res.json({
    status: 'success',
    data: { profiles }
  });
}));

router.get('/profiles/:id', protect, catchAsync(async (req, res) => {
  const profile = await prisma.brandProfile.findUnique({
    where: { id: req.params.id },
    include: {
      contentPillars: true,
      brandAssets: {
        where: { isLatest: true }
      },
      contentExamples: {
        include: {
          createdBy: {
            select: { id: true, name: true }
          }
        }
      },
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!profile) {
    return next(new AppError('Brand profile not found', 404));
  }

  res.json({
    status: 'success',
    data: { profile }
  });
}));

router.post('/profiles', protect, restrictTo('ADMIN', 'MANAGER', 'EDITOR'), catchAsync(async (req, res) => {
  const {
    name,
    description,
    brandVoice,
    brandValues,
    tagline,
    mission,
    vision,
    colorPalette,
    typography,
    logoUrls,
    contentGuidelines,
    voiceExamples,
    targetAudience
  } = req.body;

  const profile = await prisma.brandProfile.create({
    data: {
      name,
      description,
      brandVoice: brandVoice ? JSON.stringify(brandVoice) : null,
      brandValues: brandValues ? JSON.stringify(brandValues) : null,
      tagline,
      mission,
      vision,
      colorPalette: colorPalette ? JSON.stringify(colorPalette) : null,
      typography: typography ? JSON.stringify(typography) : null,
      logoUrls: logoUrls ? JSON.stringify(logoUrls) : null,
      contentGuidelines,
      voiceExamples: voiceExamples ? JSON.stringify(voiceExamples) : null,
      targetAudience: targetAudience ? JSON.stringify(targetAudience) : null,
      createdById: req.user.id
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  res.status(201).json({
    status: 'success',
    data: { profile }
  });
}));

router.put('/profiles/:id', protect, restrictTo('ADMIN', 'MANAGER'), catchAsync(async (req, res) => {
  const {
    name,
    description,
    brandVoice,
    brandValues,
    tagline,
    mission,
    vision,
    colorPalette,
    typography,
    logoUrls,
    contentGuidelines,
    voiceExamples,
    targetAudience,
    isActive
  } = req.body;

  const profile = await prisma.brandProfile.update({
    where: { id: req.params.id },
    data: {
      name,
      description,
      brandVoice: brandVoice ? JSON.stringify(brandVoice) : null,
      brandValues: brandValues ? JSON.stringify(brandValues) : null,
      tagline,
      mission,
      vision,
      colorPalette: colorPalette ? JSON.stringify(colorPalette) : null,
      typography: typography ? JSON.stringify(typography) : null,
      logoUrls: logoUrls ? JSON.stringify(logoUrls) : null,
      contentGuidelines,
      voiceExamples: voiceExamples ? JSON.stringify(voiceExamples) : null,
      targetAudience: targetAudience ? JSON.stringify(targetAudience) : null,
      isActive
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  res.json({
    status: 'success',
    data: { profile }
  });
}));

// Content Pillars Routes
router.get('/profiles/:profileId/pillars', protect, catchAsync(async (req, res) => {
  const pillars = await prisma.contentPillar.findMany({
    where: { brandProfileId: req.params.profileId },
    include: {
      content: {
        take: 3,
        select: { id: true, title: true, type: true, status: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    status: 'success',
    data: { pillars }
  });
}));

router.post('/profiles/:profileId/pillars', protect, restrictTo('ADMIN', 'MANAGER', 'EDITOR'), catchAsync(async (req, res) => {
  const {
    name,
    description,
    keywords,
    topics,
    toneGuide,
    examples,
    frequency,
    platforms,
    cta
  } = req.body;

  const pillar = await prisma.contentPillar.create({
    data: {
      name,
      description,
      keywords: keywords ? JSON.stringify(keywords) : null,
      topics: topics ? JSON.stringify(topics) : null,
      toneGuide,
      examples: examples ? JSON.stringify(examples) : null,
      frequency,
      platforms: platforms ? JSON.stringify(platforms) : null,
      cta,
      brandProfileId: req.params.profileId
    }
  });

  res.status(201).json({
    status: 'success',
    data: { pillar }
  });
}));

router.put('/pillars/:id', protect, restrictTo('ADMIN', 'MANAGER', 'EDITOR'), catchAsync(async (req, res) => {
  const {
    name,
    description,
    keywords,
    topics,
    toneGuide,
    examples,
    frequency,
    platforms,
    cta,
    performance
  } = req.body;

  const pillar = await prisma.contentPillar.update({
    where: { id: req.params.id },
    data: {
      name,
      description,
      keywords: keywords ? JSON.stringify(keywords) : null,
      topics: topics ? JSON.stringify(topics) : null,
      toneGuide,
      examples: examples ? JSON.stringify(examples) : null,
      frequency,
      platforms: platforms ? JSON.stringify(platforms) : null,
      cta,
      performance: performance ? JSON.stringify(performance) : null
    }
  });

  res.json({
    status: 'success',
    data: { pillar }
  });
}));

// Brand Assets Routes
router.get('/profiles/:profileId/assets', protect, catchAsync(async (req, res) => {
  const { category, search } = req.query;
  
  const where = {
    brandProfileId: req.params.profileId,
    isLatest: true
  };

  if (category) {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { tags: { contains: search, mode: 'insensitive' } }
    ];
  }

  const assets = await prisma.brandAsset.findMany({
    where,
    include: {
      uploadedBy: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    status: 'success',
    data: { assets }
  });
}));

router.post('/profiles/:profileId/assets', protect, upload.single('file'), catchAsync(async (req, res) => {
  if (!req.file) {
    return next(new AppError('Please upload a file', 400));
  }

  const {
    name,
    category,
    usageRules,
    tags,
    version
  } = req.body;

  const asset = await prisma.brandAsset.create({
    data: {
      name: name || req.file.originalname,
      category: category || 'general',
      fileUrl: `/uploads/brand/${req.file.filename}`,
      fileType: path.extname(req.file.originalname).toLowerCase(),
      fileSize: req.file.size,
      usageRules,
      tags: tags ? JSON.stringify(tags.split(',').map(tag => tag.trim())) : null,
      version: version || '1.0',
      brandProfileId: req.params.profileId,
      uploadedById: req.user.id
    },
    include: {
      uploadedBy: {
        select: { id: true, name: true }
      }
    }
  });

  res.status(201).json({
    status: 'success',
    data: { asset }
  });
}));

// Content Examples Routes
router.get('/profiles/:profileId/examples', protect, catchAsync(async (req, res) => {
  const { type, platform } = req.query;
  
  const where = {
    brandProfileId: req.params.profileId
  };

  if (type) where.type = type;
  if (platform) where.platform = platform;

  const examples = await prisma.brandContentExample.findMany({
    where,
    include: {
      createdBy: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    status: 'success',
    data: { examples }
  });
}));

router.post('/profiles/:profileId/examples', protect, restrictTo('ADMIN', 'MANAGER', 'EDITOR'), catchAsync(async (req, res) => {
  const {
    title,
    content,
    type,
    platform,
    analysis,
    pillars,
    performance,
    tags
  } = req.body;

  const example = await prisma.brandContentExample.create({
    data: {
      title,
      content,
      type,
      platform,
      analysis,
      pillars: pillars ? JSON.stringify(pillars) : null,
      performance: performance ? JSON.stringify(performance) : null,
      tags: tags ? JSON.stringify(tags) : null,
      brandProfileId: req.params.profileId,
      createdById: req.user.id
    },
    include: {
      createdBy: {
        select: { id: true, name: true }
      }
    }
  });

  res.status(201).json({
    status: 'success',
    data: { example }
  });
}));

// Analytics endpoint for brand content performance
router.get('/profiles/:profileId/analytics', protect, catchAsync(async (req, res) => {
  const profileId = req.params.profileId;

  // Get content pillar performance
  const pillarStats = await prisma.contentPillar.findMany({
    where: { brandProfileId: profileId },
    include: {
      content: {
        select: { id: true, status: true, type: true }
      }
    }
  });

  // Get brand asset usage
  const assetStats = await prisma.brandAsset.findMany({
    where: { brandProfileId: profileId, isLatest: true },
    select: { category: true, createdAt: true }
  });

  // Calculate metrics
  const analytics = {
    contentPillars: {
      total: pillarStats.length,
      contentCount: pillarStats.reduce((acc, pillar) => acc + pillar.content.length, 0),
      breakdown: pillarStats.map(pillar => ({
        id: pillar.id,
        name: pillar.name,
        contentCount: pillar.content.length,
        publishedCount: pillar.content.filter(c => c.status === 'published').length
      }))
    },
    brandAssets: {
      total: assetStats.length,
      categories: assetStats.reduce((acc, asset) => {
        acc[asset.category] = (acc[asset.category] || 0) + 1;
        return acc;
      }, {})
    }
  };

  res.json({
    status: 'success',
    data: { analytics }
  });
}));

module.exports = router;