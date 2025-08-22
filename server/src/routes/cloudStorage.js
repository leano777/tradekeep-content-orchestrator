const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { requireAuth } = require('../middleware/permissions');
const googleAuthService = require('../services/auth/googleAuthService');
const microsoftAuthService = require('../services/auth/microsoftAuthService');
const googleDriveService = require('../services/storage/googleDriveService');

// Initiate OAuth flow
router.get('/auth/:provider', requireAuth, async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user.id;
    
    let authUrl;
    if (provider === 'google') {
      authUrl = googleAuthService.getAuthUrl(userId);
    } else if (provider === 'microsoft') {
      authUrl = await microsoftAuthService.getAuthUrl(userId);
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    
    res.json({ authUrl });
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate authentication' });
  }
});

// OAuth callback
router.get('/callback/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state: userId } = req.query;
    
    if (!code || !userId) {
      return res.status(400).json({ error: 'Missing authorization code or user ID' });
    }
    
    let result;
    if (provider === 'google') {
      result = await googleAuthService.handleCallback(code, userId);
    } else if (provider === 'microsoft') {
      result = await microsoftAuthService.handleCallback(code, userId);
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    
    // Redirect to success page or return JSON
    res.redirect(`http://localhost:8080/test-assets.html?connected=${provider}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`http://localhost:8080/test-assets.html?error=auth_failed`);
  }
});

// List cloud files
router.get('/:provider/files', requireAuth, async (req, res) => {
  try {
    const { provider } = req.params;
    const { folderId, search, mimeType, pageToken, limit } = req.query;
    
    let files;
    if (provider === 'google') {
      files = await googleDriveService.listFiles(req.user.id, {
        folderId,
        search,
        mimeType,
        pageToken,
        limit: parseInt(limit) || 20
      });
    } else if (provider === 'microsoft') {
      // Implement OneDrive list files
      return res.status(501).json({ error: 'OneDrive listing not yet implemented' });
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    
    res.json(files);
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import file from cloud to local storage
router.post('/:provider/import/:fileId', requireAuth, async (req, res) => {
  try {
    const { provider, fileId } = req.params;
    const { folderId } = req.body;
    
    if (provider === 'google') {
      // Get file metadata
      const metadata = await googleDriveService.getFileMetadata(req.user.id, fileId);
      
      // Download to temp location
      const tempPath = path.join(__dirname, '../../uploads/temp', `${Date.now()}_${metadata.name}`);
      await googleDriveService.downloadFile(req.user.id, fileId, tempPath);
      
      // Create asset record
      const asset = await prisma.asset.create({
        data: {
          filename: metadata.name,
          originalName: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size,
          url: `/uploads/${path.basename(tempPath)}`,
          storageKey: path.basename(tempPath),
          storageProvider: 'GOOGLE_DRIVE',
          cloudFileId: fileId,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          cloudMetadata: JSON.stringify(metadata),
          folderId,
          uploadedById: req.user.id,
          teamId: req.user.teamId
        }
      });
      
      // Move to permanent location
      const permanentPath = path.join(__dirname, '../../uploads', path.basename(tempPath));
      await fs.rename(tempPath, permanentPath);
      
      res.json({ success: true, asset });
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }
  } catch (error) {
    console.error('Import file error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync asset between storage providers
router.post('/sync/:assetId', requireAuth, async (req, res) => {
  try {
    const { assetId } = req.params;
    const { targetProvider } = req.body;
    
    const asset = await prisma.asset.findUnique({
      where: { id: assetId }
    });
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Update sync status
    await prisma.asset.update({
      where: { id: assetId },
      data: {
        syncStatus: 'PENDING'
      }
    });
    
    if (targetProvider === 'GOOGLE_DRIVE' && asset.storageProvider === 'LOCAL') {
      // Upload local file to Google Drive
      const filePath = path.join(__dirname, '../../uploads', asset.storageKey);
      const cloudFile = await googleDriveService.uploadFile(req.user.id, filePath, {
        name: asset.originalName,
        mimeType: asset.mimeType,
        assetId: asset.id
      });
      
      // Update asset with cloud info
      await prisma.asset.update({
        where: { id: assetId },
        data: {
          storageProvider: 'GOOGLE_DRIVE',
          cloudFileId: cloudFile.id,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          cloudMetadata: JSON.stringify(cloudFile)
        }
      });
      
      res.json({ success: true, cloudFile });
    } else {
      res.status(400).json({ error: 'Unsupported sync operation' });
    }
  } catch (error) {
    console.error('Sync error:', error);
    
    // Update sync status to error
    await prisma.asset.update({
      where: { id: req.params.assetId },
      data: {
        syncStatus: 'ERROR'
      }
    });
    
    res.status(500).json({ error: error.message });
  }
});

// Get connected cloud accounts
router.get('/accounts', requireAuth, async (req, res) => {
  try {
    const accounts = await prisma.cloudAccount.findMany({
      where: {
        userId: req.user.id,
        isActive: true
      },
      select: {
        id: true,
        provider: true,
        email: true,
        createdAt: true
      }
    });
    
    res.json(accounts);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to get cloud accounts' });
  }
});

// Disconnect cloud account
router.delete('/accounts/:provider', requireAuth, async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (provider === 'google') {
      await googleAuthService.disconnect(req.user.id);
    } else if (provider === 'microsoft') {
      await microsoftAuthService.disconnect(req.user.id);
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

const path = require('path');
const fs = require('fs').promises;

module.exports = router;