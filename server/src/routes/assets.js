const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { upload } = require('../middleware/upload');
const { requireAuth } = require('../middleware/permissions');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

// Upload assets
router.post('/upload', requireAuth, upload.array('files', 10), async (req, res) => {
  try {
    const { folderId } = req.body;
    const uploadedAssets = [];
    
    for (const file of req.files) {
      let thumbnailUrl = null;
      let width = null;
      let height = null;
      
      // Generate thumbnail for images
      if (file.mimetype.startsWith('image/')) {
        try {
          const metadata = await sharp(file.path).metadata();
          width = metadata.width;
          height = metadata.height;
          
          // Create thumbnail
          const thumbnailPath = file.path.replace(path.extname(file.path), '_thumb.jpg');
          await sharp(file.path)
            .resize(300, 300, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
          thumbnailUrl = `/uploads/${path.basename(thumbnailPath)}`;
        } catch (err) {
          console.error('Thumbnail generation failed:', err);
        }
      }
      
      // Move file to permanent location
      const permanentPath = path.join(__dirname, '../../uploads', path.basename(file.path));
      await fs.rename(file.path, permanentPath);
      
      // Create asset record
      const asset = await prisma.asset.create({
        data: {
          filename: path.basename(file.path),
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: `/uploads/${path.basename(file.path)}`,
          storageKey: path.basename(file.path),
          thumbnailUrl,
          width,
          height,
          folderId,
          uploadedById: req.user.id,
          teamId: req.user.teamId,
          metadata: JSON.stringify({
            uploadedAt: new Date(),
            ip: req.ip
          })
        }
      });
      
      // Log history
      await prisma.assetHistory.create({
        data: {
          assetId: asset.id,
          action: 'upload',
          userId: req.user.id,
          details: JSON.stringify({ originalName: file.originalname })
        }
      });
      
      uploadedAssets.push(asset);
    }
    
    res.status(201).json({ assets: uploadedAssets });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload assets' });
  }
});

// List assets with filtering
router.get('/', requireAuth, async (req, res) => {
  try {
    const { folderId, type, search, page = 1, limit = 20 } = req.query;
    const where = { teamId: req.user.teamId };
    
    if (folderId) where.folderId = folderId;
    if (type) where.mimeType = { contains: type };
    if (search) {
      where.OR = [
        { filename: { contains: search } },
        { originalName: { contains: search } }
      ];
    }
    
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          folder: true,
          uploadedBy: { select: { id: true, username: true } },
          tags: { include: { tag: true } }
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.asset.count({ where })
    ]);
    
    res.json({
      assets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List assets error:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// Get asset details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: {
        folder: true,
        uploadedBy: { select: { id: true, username: true } },
        tags: { include: { tag: true } },
        versions: { orderBy: { versionNumber: 'desc' } },
        history: {
          include: { user: { select: { username: true } } },
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    });
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    res.json(asset);
  } catch (error) {
    console.error('Get asset error:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// Update asset metadata
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { filename, folderId, metadata } = req.body;
    
    const asset = await prisma.asset.update({
      where: { id: req.params.id },
      data: {
        filename,
        folderId,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        updatedAt: new Date()
      }
    });
    
    await prisma.assetHistory.create({
      data: {
        assetId: asset.id,
        action: 'update',
        userId: req.user.id,
        details: JSON.stringify({ fields: Object.keys(req.body) })
      }
    });
    
    res.json(asset);
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// Delete asset
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id }
    });
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Delete physical files
    try {
      const filePath = path.join(__dirname, '../../uploads', asset.storageKey);
      await fs.unlink(filePath);
      
      if (asset.thumbnailUrl) {
        const thumbPath = path.join(__dirname, '../..', asset.thumbnailUrl);
        await fs.unlink(thumbPath).catch(() => {}); // Ignore if thumbnail doesn't exist
      }
    } catch (err) {
      console.error('File deletion error:', err);
    }
    
    await prisma.asset.delete({ where: { id: req.params.id } });
    
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// Add tags to asset
router.post('/:id/tags', requireAuth, async (req, res) => {
  try {
    const { tagIds } = req.body;
    
    for (const tagId of tagIds) {
      await prisma.assetTagRelation.create({
        data: {
          assetId: req.params.id,
          tagId
        }
      }).catch(() => {}); // Ignore duplicates
    }
    
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: { tags: { include: { tag: true } } }
    });
    
    res.json(asset);
  } catch (error) {
    console.error('Add tags error:', error);
    res.status(500).json({ error: 'Failed to add tags' });
  }
});

module.exports = router;