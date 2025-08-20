const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('./db');
const passwordResetRoutes = require('./routes/passwordReset');
const { validateRegistration, validateLogin, loginRateLimit, passwordResetRateLimit } = require('./middleware/validation');
const { 
  authenticateUser, 
  requireAuth, 
  requirePermission, 
  requireOwnershipOrPermission, 
  requireMinimumRole,
  getContentOwnerId 
} = require('./middleware/permissions');
const publishingService = require('./services/socialMedia/publishingService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 9001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:4200', 'http://localhost:5000', 'http://localhost:7000'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'TradeKeep Content Orchestrator Backend'
  });
});

// API status
app.get('/api/v1/status', (req, res) => {
  res.json({
    message: 'TradeKeep Content Management System API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Apply user authentication to all routes
app.use(authenticateUser);

// Auth routes
app.post('/api/v1/auth/register', validateRegistration, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'EDITOR'
      }
    });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);

    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/v1/auth/login', loginRateLimit, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/v1/auth/me', requireAuth, async (req, res) => {
  try {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

app.post('/api/v1/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Password reset routes
app.use('/api/v1/auth', passwordResetRateLimit, passwordResetRoutes);

// Dashboard stats
app.get('/api/v1/dashboard/stats', requirePermission('dashboard:view'), async (req, res) => {
  try {
    const [totalContent, publishedContent, scheduledContent, draftContent] = await Promise.all([
      prisma.content.count(),
      prisma.content.count({ where: { status: 'published' } }),
      prisma.content.count({ where: { status: 'scheduled' } }),
      prisma.content.count({ where: { status: 'draft' } })
    ]);

    const stats = {
      totalContent,
      publishedContent,
      scheduledContent,
      draftContent
    };
    res.json({ status: 'success', data: stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// Content calendar
app.get('/api/v1/content/calendar', requirePermission('content:read'), async (req, res) => {
  try {
    const { start, end } = req.query;
    let whereClause = {};

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      whereClause = {
        OR: [
          {
            scheduledAt: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            AND: [
              { scheduledAt: null },
              {
                createdAt: {
                  gte: startDate,
                  lte: endDate
                }
              }
            ]
          }
        ]
      };
    }

    const content = await prisma.content.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ status: 'success', data: content });
  } catch (error) {
    console.error('Content calendar error:', error);
    res.status(500).json({ error: 'Failed to get content calendar' });
  }
});

// Enhanced content routes
app.get('/api/v1/content', requirePermission('content:read'), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const content = await prisma.content.findMany({
      take: parseInt(limit),
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      status: 'success',
      data: content
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

app.post('/api/v1/content', requirePermission('content:create'), async (req, res) => {

  try {
    const { title, body, type, status, pillar, platform, scheduledAt } = req.body;
    
    const newContent = await prisma.content.create({
      data: {
        title,
        body,
        type: type || 'post',
        status: status || 'draft',
        pillar: pillar || 'internal-os',
        platform,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        publishedAt: status === 'published' ? new Date() : null,
        authorId: req.user.id
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({
      status: 'success',
      data: newContent
    });
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// Get single content item
app.get('/api/v1/content/:id', requirePermission('content:read'), async (req, res) => {
  try {
    const content = await prisma.content.findUnique({
      where: { id: req.params.id },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({ status: 'success', data: content });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

// Update content (own content or admin)
app.put('/api/v1/content/:id', requireOwnershipOrPermission(getContentOwnerId, 'content:update:all'), async (req, res) => {
  try {
    const { title, body, type, status, pillar, platform, scheduledAt } = req.body;
    
    const updatedContent = await prisma.content.update({
      where: { id: req.params.id },
      data: {
        title,
        body,
        type,
        status,
        pillar,
        platform,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        publishedAt: status === 'published' ? new Date() : null
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({ status: 'success', data: updatedContent });
  } catch (error) {
    console.error('Update content error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Content not found' });
    }
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// Delete content (own content or admin)
app.delete('/api/v1/content/:id', requireOwnershipOrPermission(getContentOwnerId, 'content:delete:all'), async (req, res) => {
  try {
    await prisma.content.delete({
      where: { id: req.params.id }
    });

    res.json({ status: 'success', message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Delete content error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Content not found' });
    }
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// Admin only: Get all users
app.get('/api/v1/admin/users', requireMinimumRole('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            content: true,
            campaigns: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ status: 'success', data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Admin only: Update user role
app.patch('/api/v1/admin/users/:id/role', requireMinimumRole('ADMIN'), async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['VIEWER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent non-super-admin from creating super-admin
    if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can assign SUPER_ADMIN role' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ status: 'success', data: updatedUser });
  } catch (error) {
    console.error('Update user role error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Social Media Publishing Routes
app.post('/api/v1/content/:id/publish', requirePermission('content:publish'), async (req, res) => {
  try {
    const { platforms = [], options = {} } = req.body;
    
    if (!platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'At least one platform must be selected' });
    }

    const results = await publishingService.publishContent(
      req.params.id,
      platforms,
      options
    );

    res.json({ status: 'success', data: results });
  } catch (error) {
    console.error('Publishing error:', error);
    res.status(500).json({ error: error.message || 'Failed to publish content' });
  }
});

app.post('/api/v1/content/:id/schedule', requirePermission('content:publish'), async (req, res) => {
  try {
    const { platforms = [], scheduledTime, options = {} } = req.body;
    
    if (!platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'At least one platform must be selected' });
    }

    if (!scheduledTime) {
      return res.status(400).json({ error: 'Scheduled time is required' });
    }

    const result = await publishingService.scheduleContent(
      req.params.id,
      platforms,
      scheduledTime,
      options
    );

    res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('Scheduling error:', error);
    res.status(500).json({ error: error.message || 'Failed to schedule content' });
  }
});

app.get('/api/v1/social/connections', requireAuth, async (req, res) => {
  try {
    const connections = await publishingService.getPlatformConnections();
    res.json({ status: 'success', data: connections });
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: 'Failed to get social media connections' });
  }
});

app.delete('/api/v1/social/:platform/posts/:postId', requirePermission('content:delete:all'), async (req, res) => {
  try {
    const { platform, postId } = req.params;
    const result = await publishingService.deletePost(platform, postId);
    
    if (result.success) {
      res.json({ status: 'success', message: result.message });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete post' });
  }
});

// Cloud assets routes
app.get('/api/v1/cloud-assets/status', (req, res) => {
  res.json({
    status: 'success',
    data: {
      connections: {
        googledrive: false,
        onedrive: false
      }
    }
  });
});

app.get('/api/v1/cloud-assets/files', (req, res) => {
  res.json({
    status: 'success',
    data: {
      files: []
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Route ${req.originalUrl} not found on this server`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 TradeKeep CMS Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Status: http://localhost:${PORT}/api/v1/status`);
});