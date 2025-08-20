const jwt = require('jsonwebtoken');
const prisma = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Role hierarchy (higher number = more permissions)
const ROLE_LEVELS = {
  'VIEWER': 1,
  'EDITOR': 2,
  'ADMIN': 3,
  'SUPER_ADMIN': 4
};

// Role permissions mapping
const PERMISSIONS = {
  'VIEWER': [
    'content:read',
    'dashboard:view'
  ],
  'EDITOR': [
    'content:read',
    'content:create',
    'content:update:own',
    'dashboard:view',
    'assets:read',
    'assets:upload'
  ],
  'ADMIN': [
    'content:read',
    'content:create',
    'content:update:all',
    'content:delete:all',
    'content:publish',
    'dashboard:view',
    'dashboard:analytics',
    'assets:read',
    'assets:upload',
    'assets:delete',
    'campaigns:read',
    'campaigns:create',
    'campaigns:update',
    'campaigns:delete',
    'users:read'
  ],
  'SUPER_ADMIN': [
    '*' // All permissions
  ]
};

// Enhanced authentication middleware that loads user data
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ 
      where: { id: decoded.id },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Require authentication
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Check if user has specific permission
const hasPermission = (userRole, permission, resourceOwnerId = null, userId = null) => {
  const userPermissions = PERMISSIONS[userRole] || [];
  
  // Super admin has all permissions
  if (userPermissions.includes('*')) {
    return true;
  }
  
  // Check for exact permission match
  if (userPermissions.includes(permission)) {
    return true;
  }
  
  // Check for own resource permissions (e.g., content:update:own)
  if (permission.endsWith(':own') && resourceOwnerId && userId) {
    const basePermission = permission.replace(':own', ':own');
    if (userPermissions.includes(basePermission) && resourceOwnerId === userId) {
      return true;
    }
  }
  
  return false;
};

// Middleware factory for permission checking
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasPermission(req.user.role, permission, null, req.user.id)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Middleware for checking resource ownership or admin permissions
const requireOwnershipOrPermission = (getResourceOwnerIdFn, permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const resourceOwnerId = await getResourceOwnerIdFn(req);
      
      // Check if user owns the resource
      if (resourceOwnerId === req.user.id) {
        return next();
      }
      
      // Check if user has admin permission
      if (hasPermission(req.user.role, permission)) {
        return next();
      }
      
      return res.status(403).json({ 
        error: 'Access denied. You can only access your own resources or need admin permissions.',
        required: permission
      });
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ error: 'Failed to verify resource ownership' });
    }
  };
};

// Role level checking
const requireMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userLevel = ROLE_LEVELS[req.user.role] || 0;
    const requiredLevel = ROLE_LEVELS[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        error: 'Insufficient role level',
        required: minimumRole,
        current: req.user.role
      });
    }

    next();
  };
};

// Helper function to get content owner ID
const getContentOwnerId = async (req) => {
  const contentId = req.params.id || req.params.contentId;
  if (!contentId) {
    throw new Error('Content ID not found in request');
  }
  
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { authorId: true }
  });
  
  if (!content) {
    throw new Error('Content not found');
  }
  
  return content.authorId;
};

// Helper function to get campaign owner ID
const getCampaignOwnerId = async (req) => {
  const campaignId = req.params.id || req.params.campaignId;
  if (!campaignId) {
    throw new Error('Campaign ID not found in request');
  }
  
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { createdById: true }
  });
  
  if (!campaign) {
    throw new Error('Campaign not found');
  }
  
  return campaign.createdById;
};

module.exports = {
  authenticateUser,
  requireAuth,
  requirePermission,
  requireOwnershipOrPermission,
  requireMinimumRole,
  hasPermission,
  getContentOwnerId,
  getCampaignOwnerId,
  ROLE_LEVELS,
  PERMISSIONS
};