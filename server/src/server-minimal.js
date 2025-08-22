const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http');
const path = require('path');
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
const emailService = require('./services/email/resendService');
const emailTemplates = require('./services/email/templates');
const { SocketServer } = require('./websocket/socketServer');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 9001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Initialize WebSocket server if collaboration is enabled
let socketServer = null;
if (process.env.ENABLE_COLLABORATION === 'true') {
  socketServer = new SocketServer(server);
  console.log('🤝 Real-time collaboration enabled');
}

// Basic middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or file://)
    if (!origin) return callback(null, true);
    
    // Allow all localhost origins
    if (origin.startsWith('http://localhost:') || 
        origin.startsWith('http://127.0.0.1:') ||
        origin === 'null') {  // file:// protocol sends 'null' as origin
      return callback(null, true);
    }
    
    callback(null, true); // Allow all origins for testing
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// Workflow Execution Engine Routes
// Create workflow template
app.post('/api/v1/workflows/templates', requirePermission('workflow:create'), async (req, res) => {
  try {
    const { name, description, type, stages, triggers, actions } = req.body;
    
    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        type: type || 'CONTENT_APPROVAL',
        createdBy: req.user.id,
        config: JSON.stringify({
          triggers: triggers || [],
          actions: actions || [],
          autoExecute: req.body.autoExecute || false
        })
      }
    });

    // Create workflow stages
    if (stages && stages.length > 0) {
      await prisma.workflowStage.createMany({
        data: stages.map((stage, index) => ({
          workflowId: workflow.id,
          name: stage.name,
          order: index,
          type: stage.type || 'APPROVAL',
          assigneeRole: stage.assigneeRole,
          assigneeId: stage.assigneeId,
          config: JSON.stringify(stage.config || {})
        }))
      });
    }

    const workflowWithStages = await prisma.workflow.findUnique({
      where: { id: workflow.id },
      include: { stages: { orderBy: { order: 'asc' } } }
    });

    res.status(201).json(workflowWithStages);
  } catch (error) {
    console.error('Workflow creation error:', error);
    res.status(500).json({ error: 'Failed to create workflow template' });
  }
});

// Get workflow templates
app.get('/api/v1/workflows/templates', requirePermission('workflow:read'), async (req, res) => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { status: 'ACTIVE' },
      include: {
        stages: { orderBy: { order: 'asc' } },
        _count: { select: { instances: true } }
      }
    });
    res.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// Start workflow instance (execute workflow)
app.post('/api/v1/workflows/execute', requireAuth, async (req, res) => {
  try {
    const { workflowId, contentId, metadata, context } = req.body;
    
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { stages: { orderBy: { order: 'asc' } } }
    });
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Create workflow instance
    const instance = await prisma.workflowInstance.create({
      data: {
        workflowId,
        contentId,
        status: 'IN_PROGRESS',
        metadata: JSON.stringify({ ...metadata, context }),
        startedBy: req.user.id,
        currentStage: 0
      }
    });

    // Execute first stage
    await executeWorkflowStage(instance.id, workflow.stages[0], req.user);

    // Return instance with current status
    const updatedInstance = await prisma.workflowInstance.findUnique({
      where: { id: instance.id },
      include: {
        workflow: { include: { stages: true } },
        approvals: true
      }
    });

    res.status(201).json(updatedInstance);
  } catch (error) {
    console.error('Workflow execution error:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// Process workflow action (approve/reject/complete)
app.post('/api/v1/workflows/instances/:instanceId/action', requireAuth, async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { action, comments, data } = req.body;

    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: { include: { stages: { orderBy: { order: 'asc' } } } }
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Workflow instance not found' });
    }

    const currentStage = instance.workflow.stages[instance.currentStage];
    
    // Verify user can take action
    const canAct = currentStage.assigneeId === req.user.id ||
                   currentStage.assigneeRole === req.user.role ||
                   req.user.role === 'ADMIN';
    
    if (!canAct) {
      return res.status(403).json({ error: 'You cannot perform this action' });
    }

    // Record the action
    if (currentStage.type === 'APPROVAL') {
      await prisma.approval.create({
        data: {
          instanceId,
          stageId: currentStage.id,
          userId: req.user.id,
          action: action.toUpperCase(),
          comments
        }
      });
    }

    // Process based on action
    if (action === 'APPROVED' || action === 'COMPLETED') {
      const nextStageIndex = instance.currentStage + 1;
      
      if (nextStageIndex >= instance.workflow.stages.length) {
        // Workflow completed
        await prisma.workflowInstance.update({
          where: { id: instanceId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });

        // Execute completion actions
        await executeCompletionActions(instance, data);
      } else {
        // Move to next stage
        await prisma.workflowInstance.update({
          where: { id: instanceId },
          data: { currentStage: nextStageIndex }
        });

        // Execute next stage
        await executeWorkflowStage(instanceId, instance.workflow.stages[nextStageIndex], req.user);
      }
    } else if (action === 'REJECTED') {
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'REJECTED' }
      });
    }

    const updatedInstance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: { include: { stages: true } },
        approvals: { include: { user: { select: { id: true, name: true, email: true } } } }
      }
    });

    res.json(updatedInstance);
  } catch (error) {
    console.error('Workflow action error:', error);
    res.status(500).json({ error: 'Failed to process workflow action' });
  }
});

// Get workflow instances
app.get('/api/v1/workflows/instances', requireAuth, async (req, res) => {
  try {
    const { status, assignedToMe } = req.query;
    
    let where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (assignedToMe === 'true') {
      where.OR = [
        { startedBy: req.user.id },
        {
          workflow: {
            stages: {
              some: {
                OR: [
                  { assigneeId: req.user.id },
                  { assigneeRole: req.user.role }
                ]
              }
            }
          }
        }
      ];
    }

    const instances = await prisma.workflowInstance.findMany({
      where,
      include: {
        workflow: true,
        content: { select: { id: true, title: true, type: true } },
        startedByUser: { select: { id: true, name: true, email: true } },
        approvals: {
          include: {
            user: { select: { id: true, name: true } },
            stage: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    // Filter to show only instances needing action from current user
    const instancesWithActionStatus = instances.map(instance => {
      const currentStage = instance.workflow.stages?.[instance.currentStage];
      const needsAction = instance.status === 'IN_PROGRESS' && currentStage && (
        currentStage.assigneeId === req.user.id ||
        currentStage.assigneeRole === req.user.role
      );
      
      const hasActed = instance.approvals.some(
        a => a.stageId === currentStage?.id && a.userId === req.user.id
      );

      return {
        ...instance,
        needsMyAction: needsAction && !hasActed,
        currentStageName: currentStage?.name
      };
    });

    res.json(instancesWithActionStatus);
  } catch (error) {
    console.error('Error fetching workflow instances:', error);
    res.status(500).json({ error: 'Failed to fetch workflow instances' });
  }
});

// Task Management Routes
app.post('/api/v1/tasks', requireAuth, async (req, res) => {
  try {
    const { title, description, type, priority, assigneeId, dueDate, contentId, metadata } = req.body;
    
    const task = await prisma.task.create({
      data: {
        title,
        description,
        type: type || 'CUSTOM',
        priority: priority || 'MEDIUM',
        status: 'TODO',
        assigneeId: assigneeId || req.user.id,
        createdBy: req.user.id,
        contentId,
        dueDate: dueDate ? new Date(dueDate) : null,
        metadata: metadata ? JSON.stringify(metadata) : null
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    // Create notification for assignee
    if (assigneeId && assigneeId !== req.user.id) {
      await prisma.notification.create({
        data: {
          type: 'TASK_ASSIGNED',
          message: `New task assigned: ${title}`,
          userId: assigneeId,
          metadata: JSON.stringify({ taskId: task.id })
        }
      });
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.get('/api/v1/tasks', requireAuth, async (req, res) => {
  try {
    const { status, assigneeId, priority } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (priority) where.priority = priority;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        content: { select: { id: true, title: true } }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.patch('/api/v1/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check permission
    const canEdit = task.assigneeId === req.user.id ||
                   task.createdBy === req.user.id ||
                   req.user.role === 'ADMIN';
    
    if (!canEdit) {
      return res.status(403).json({ error: 'Cannot edit this task' });
    }

    // Handle status completion
    if (updates.status === 'COMPLETED' && task.status !== 'COMPLETED') {
      updates.completedAt = new Date();
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updates,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Helper functions for workflow execution
async function executeWorkflowStage(instanceId, stage, user) {
  if (!stage) return;

  switch (stage.type) {
    case 'APPROVAL':
      await createApprovalNotification(instanceId, stage, user.id);
      break;
    case 'TASK':
      await createTaskFromStage(instanceId, stage, user.id);
      break;
    case 'NOTIFICATION':
      await sendStageNotification(instanceId, stage);
      break;
    case 'AUTO':
      await executeAutomatedStage(instanceId, stage);
      break;
  }
}

async function createApprovalNotification(instanceId, stage, requesterId) {
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: instanceId },
    include: { content: true }
  });

  const message = `Approval needed: ${stage.name}${instance.content ? ` for "${instance.content.title}"` : ''}`;

  if (stage.assigneeId) {
    await prisma.notification.create({
      data: {
        type: 'APPROVAL_REQUEST',
        message,
        userId: stage.assigneeId,
        metadata: JSON.stringify({ instanceId, stageId: stage.id })
      }
    });
  } else if (stage.assigneeRole) {
    const users = await prisma.user.findMany({ where: { role: stage.assigneeRole } });
    await prisma.notification.createMany({
      data: users.map(user => ({
        type: 'APPROVAL_REQUEST',
        message,
        userId: user.id,
        metadata: JSON.stringify({ instanceId, stageId: stage.id })
      }))
    });
  }
}

async function createTaskFromStage(instanceId, stage, creatorId) {
  const config = JSON.parse(stage.config || '{}');
  
  await prisma.task.create({
    data: {
      title: config.taskTitle || stage.name,
      description: config.taskDescription,
      type: 'WORKFLOW_TASK',
      priority: config.priority || 'MEDIUM',
      assigneeId: stage.assigneeId,
      createdBy: creatorId,
      metadata: JSON.stringify({ instanceId, stageId: stage.id })
    }
  });
}

async function sendStageNotification(instanceId, stage) {
  const config = JSON.parse(stage.config || '{}');
  const recipients = config.recipients || [];
  
  for (const recipientId of recipients) {
    await prisma.notification.create({
      data: {
        type: 'WORKFLOW_UPDATE',
        message: config.message || `Workflow stage: ${stage.name}`,
        userId: recipientId,
        metadata: JSON.stringify({ instanceId, stageId: stage.id })
      }
    });
  }
}

async function executeAutomatedStage(instanceId, stage) {
  const config = JSON.parse(stage.config || '{}');
  
  // Auto-complete after executing action
  setTimeout(async () => {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId }
    });
    
    if (instance.currentStage === stage.order) {
      // Auto-advance to next stage
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { currentStage: instance.currentStage + 1 }
      });
    }
  }, config.delay || 1000);
}

async function executeCompletionActions(instance, data) {
  // Auto-publish content if configured
  if (instance.contentId) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: instance.workflowId }
    });
    
    const config = JSON.parse(workflow.config || '{}');
    if (config.autoPublish) {
      await prisma.content.update({
        where: { id: instance.contentId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date()
        }
      });
    }
  }

  // Send completion notifications
  await prisma.notification.create({
    data: {
      type: 'WORKFLOW_COMPLETED',
      message: `Workflow completed: ${instance.workflow?.name}`,
      userId: instance.startedBy
    }
  });
}

// Collaboration routes (if enabled)
if (process.env.ENABLE_COLLABORATION === 'true') {
  const commentsRoutes = require('./routes/comments');
  const activitiesRoutes = require('./routes/activities');
  const notificationsRoutes = require('./routes/notifications');
  
  app.use('/api/v1', commentsRoutes);
  app.use('/api/v1/activities', activitiesRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
}

// Asset management routes
const assetRoutes = require('./routes/assets');
const cloudStorageRoutes = require('./routes/cloudStorage');
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/assets/cloud', cloudStorageRoutes);

// Brand Documentation System
const brandRoutes = require('./routes/brand');
app.use('/api/v1/brand', brandRoutes);

// Analytics System
const analyticsRoutes = require('./routes/analytics');
app.use('/api/v1/analytics', analyticsRoutes);

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

// Email Campaign Routes

// Get all email subscribers
app.get('/api/v1/email/subscribers', requirePermission('users:read'), async (req, res) => {
  try {
    const { status, limit = 100 } = req.query;
    
    const where = status ? { status } : {};
    
    const subscribers = await prisma.emailSubscriber.findMany({
      where,
      take: parseInt(limit),
      orderBy: { subscribedAt: 'desc' }
    });
    
    res.json({ status: 'success', data: subscribers });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ error: 'Failed to get subscribers' });
  }
});

// Add email subscriber
app.post('/api/v1/email/subscribers', async (req, res) => {
  try {
    const { email, name, tags, metadata } = req.body;
    
    const subscriber = await prisma.emailSubscriber.create({
      data: {
        email,
        name,
        tags: tags ? JSON.stringify(tags) : null,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
    
    // Send welcome email
    if (emailService.isConfigured || process.env.NODE_ENV === 'development') {
      const welcomeHtml = emailTemplates.welcomeTemplate({ subscriberName: name });
      await emailService.sendEmail(
        email,
        'Welcome to TradeKeep!',
        welcomeHtml,
        { fromName: 'TradeKeep Team' }
      );
    }
    
    res.json({ status: 'success', data: subscriber });
  } catch (error) {
    console.error('Add subscriber error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already subscribed' });
    }
    res.status(500).json({ error: 'Failed to add subscriber' });
  }
});

// Unsubscribe
app.post('/api/v1/email/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await emailService.handleUnsubscribe(email);
    
    if (result.success) {
      res.json({ status: 'success', message: result.message });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Get email campaigns
app.get('/api/v1/email/campaigns', requireAuth, async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;
    
    const where = status ? { status } : {};
    
    const campaigns = await prisma.emailCampaign.findMany({
      where,
      take: parseInt(limit),
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { recipients: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ status: 'success', data: campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

// Create email campaign
app.post('/api/v1/email/campaigns', requirePermission('campaigns:create'), async (req, res) => {
  try {
    const { 
      name, 
      subject, 
      content, 
      plainText,
      fromName = 'TradeKeep',
      fromEmail = process.env.EMAIL_FROM || 'noreply@tradekeep.com',
      replyTo,
      tags,
      subscriberTags
    } = req.body;
    
    // Create campaign
    const campaign = await prisma.emailCampaign.create({
      data: {
        name,
        subject,
        content,
        plainText,
        fromName,
        fromEmail,
        replyTo,
        tags: tags ? JSON.stringify(tags) : null,
        createdById: req.user.id
      }
    });
    
    // Add recipients based on subscriber tags
    if (subscriberTags && subscriberTags.length > 0) {
      const subscribers = await prisma.emailSubscriber.findMany({
        where: {
          status: 'active',
          OR: subscriberTags.map(tag => ({
            tags: { contains: tag }
          }))
        }
      });
      
      if (subscribers.length > 0) {
        await prisma.emailCampaignRecipient.createMany({
          data: subscribers.map(sub => ({
            campaignId: campaign.id,
            subscriberId: sub.id
          }))
        });
        
        await prisma.emailCampaign.update({
          where: { id: campaign.id },
          data: { totalRecipients: subscribers.length }
        });
      }
    } else {
      // Add all active subscribers if no tags specified
      const subscribers = await prisma.emailSubscriber.findMany({
        where: { status: 'active' }
      });
      
      if (subscribers.length > 0) {
        await prisma.emailCampaignRecipient.createMany({
          data: subscribers.map(sub => ({
            campaignId: campaign.id,
            subscriberId: sub.id
          }))
        });
        
        await prisma.emailCampaign.update({
          where: { id: campaign.id },
          data: { totalRecipients: subscribers.length }
        });
      }
    }
    
    res.json({ status: 'success', data: campaign });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Send email campaign
app.post('/api/v1/email/campaigns/:id/send', requirePermission('campaigns:create'), async (req, res) => {
  try {
    const result = await emailService.sendCampaign(req.params.id);
    
    if (result.success) {
      res.json({ status: 'success', data: result });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

// Schedule email campaign
app.post('/api/v1/email/campaigns/:id/schedule', requirePermission('campaigns:create'), async (req, res) => {
  try {
    const { scheduledAt } = req.body;
    
    if (!scheduledAt) {
      return res.status(400).json({ error: 'Scheduled time is required' });
    }
    
    const campaign = await prisma.emailCampaign.update({
      where: { id: req.params.id },
      data: {
        status: 'scheduled',
        scheduledAt: new Date(scheduledAt)
      }
    });
    
    // In production, you'd set up a job queue here
    const delay = new Date(scheduledAt).getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        console.log(`⏰ Sending scheduled email campaign ${req.params.id}`);
        await emailService.sendCampaign(req.params.id);
      }, delay);
    }
    
    res.json({ status: 'success', data: campaign });
  } catch (error) {
    console.error('Schedule campaign error:', error);
    res.status(500).json({ error: 'Failed to schedule campaign' });
  }
});

// Get campaign statistics
app.get('/api/v1/email/campaigns/:id/stats', requireAuth, async (req, res) => {
  try {
    const stats = await emailService.getCampaignStats(req.params.id);
    res.json({ status: 'success', data: stats });
  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({ error: 'Failed to get campaign statistics' });
  }
});

// Track email open (pixel tracking)
app.get('/api/v1/email/track/open/:campaignId/:subscriberId', async (req, res) => {
  const { campaignId, subscriberId } = req.params;
  await emailService.trackOpen(campaignId, subscriberId);
  
  // Return 1x1 transparent pixel
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private'
  });
  res.end(pixel);
});

// Track email click
app.get('/api/v1/email/track/click/:campaignId/:subscriberId', async (req, res) => {
  const { campaignId, subscriberId } = req.params;
  const { url } = req.query;
  
  await emailService.trackClick(campaignId, subscriberId, url);
  
  if (url) {
    res.redirect(url);
  } else {
    res.status(400).json({ error: 'No redirect URL provided' });
  }
});

// Get email templates
app.get('/api/v1/email/templates', requireAuth, async (req, res) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ status: 'success', data: templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Create email template
app.post('/api/v1/email/templates', requirePermission('campaigns:create'), async (req, res) => {
  try {
    const { name, subject, content, plainText, category, variables } = req.body;
    
    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        content,
        plainText,
        category,
        variables: variables ? JSON.stringify(variables) : null,
        createdById: req.user.id
      }
    });
    
    res.json({ status: 'success', data: template });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
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

// Content Templates Routes
app.get('/api/v1/content-templates', requireAuth, async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (category) where.category = category;

    const [templates, total] = await Promise.all([
      prisma.contentTemplate.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.contentTemplate.count({ where })
    ]);

    res.json({
      status: 'success',
      results: templates.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: templates
    });
  } catch (error) {
    console.error('Get content templates error:', error);
    res.status(500).json({ error: 'Failed to get content templates' });
  }
});

app.post('/api/v1/content-templates', requirePermission('content:create'), async (req, res) => {
  try {
    const { name, description, content, category, variables, thumbnail } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }

    const template = await prisma.contentTemplate.create({
      data: {
        name,
        description,
        content,
        category: category || 'general',
        variables: variables ? JSON.stringify(variables) : null,
        thumbnail,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({ status: 'success', data: template });
  } catch (error) {
    console.error('Create content template error:', error);
    res.status(500).json({ error: 'Failed to create content template' });
  }
});

app.get('/api/v1/content-templates/:id', requireAuth, async (req, res) => {
  try {
    const template = await prisma.contentTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ status: 'success', data: template });
  } catch (error) {
    console.error('Get content template error:', error);
    res.status(500).json({ error: 'Failed to get content template' });
  }
});

app.put('/api/v1/content-templates/:id', requirePermission('content:edit'), async (req, res) => {
  try {
    const { name, description, content, category, variables, thumbnail } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (content) updateData.content = content;
    if (category) updateData.category = category;
    if (variables !== undefined) updateData.variables = variables ? JSON.stringify(variables) : null;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;

    const template = await prisma.contentTemplate.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({ status: 'success', data: template });
  } catch (error) {
    console.error('Update content template error:', error);
    res.status(500).json({ error: 'Failed to update content template' });
  }
});

app.delete('/api/v1/content-templates/:id', requirePermission('content:delete'), async (req, res) => {
  try {
    await prisma.contentTemplate.delete({
      where: { id: req.params.id }
    });

    res.json({ status: 'success', message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete content template error:', error);
    res.status(500).json({ error: 'Failed to delete content template' });
  }
});

// Campaign Routes
app.get('/api/v1/campaigns', requireAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true }
          },
          content: {
            include: {
              content: {
                select: { id: true, title: true, status: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.campaign.count({ where })
    ]);

    res.json({
      status: 'success',
      results: campaigns.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: campaigns
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

app.post('/api/v1/campaigns', requirePermission('campaigns:create'), async (req, res) => {
  try {
    const { name, description, status = 'draft', startDate, endDate } = req.body;

    if (!name || !startDate) {
      return res.status(400).json({ error: 'Name and start date are required' });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        status,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        content: {
          include: {
            content: {
              select: { id: true, title: true, status: true }
            }
          }
        }
      }
    });

    res.json({ status: 'success', data: campaign });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

app.get('/api/v1/campaigns/:id', requireAuth, async (req, res) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        content: {
          include: {
            content: {
              select: { id: true, title: true, status: true, type: true, createdAt: true }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ status: 'success', data: campaign });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

app.put('/api/v1/campaigns/:id', requirePermission('campaigns:edit'), async (req, res) => {
  try {
    const { name, description, status, startDate, endDate } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        content: {
          include: {
            content: {
              select: { id: true, title: true, status: true }
            }
          }
        }
      }
    });

    res.json({ status: 'success', data: campaign });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

app.delete('/api/v1/campaigns/:id', requirePermission('campaigns:delete'), async (req, res) => {
  try {
    await prisma.campaign.delete({
      where: { id: req.params.id }
    });

    res.json({ status: 'success', message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

app.post('/api/v1/campaigns/:id/content', requirePermission('campaigns:edit'), async (req, res) => {
  try {
    const { contentIds } = req.body;
    
    if (!Array.isArray(contentIds)) {
      return res.status(400).json({ error: 'Content IDs must be an array' });
    }

    // Remove existing content
    await prisma.campaignContent.deleteMany({
      where: { campaignId: req.params.id }
    });

    // Add new content with order
    if (contentIds.length > 0) {
      const campaignContent = contentIds.map((contentId, index) => ({
        campaignId: req.params.id,
        contentId,
        order: index
      }));

      await prisma.campaignContent.createMany({
        data: campaignContent
      });
    }

    const updatedCampaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        content: {
          include: {
            content: {
              select: { id: true, title: true, status: true }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    res.json({ status: 'success', data: updatedCampaign });
  } catch (error) {
    console.error('Update campaign content error:', error);
    res.status(500).json({ error: 'Failed to update campaign content' });
  }
});

// Workflow routes
app.get('/api/v1/workflows', requireAuth, async (req, res) => {
  try {
    const workflows = await prisma.workflow.findMany({
      include: {
        stages: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { instances: true }
        }
      }
    });

    res.json({ status: 'success', data: workflows });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

app.post('/api/v1/workflows', requirePermission('workflow:create'), async (req, res) => {
  try {
    const { name, description, type, stages } = req.body;

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        type,
        stages: {
          create: stages.map((stage, index) => ({
            name: stage.name,
            type: stage.type,
            assignedTo: stage.assignedTo,
            config: JSON.stringify(stage.config || {}),
            order: index
          }))
        }
      },
      include: {
        stages: {
          orderBy: { order: 'asc' }
        }
      }
    });

    res.json({ status: 'success', data: workflow });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

app.get('/api/v1/workflows/instances', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    
    if (status) {
      where.status = status;
    }

    const instances = await prisma.workflowInstance.findMany({
      where,
      include: {
        workflow: true,
        content: {
          select: { id: true, title: true }
        },
        approvals: {
          include: {
            approvedBy: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ status: 'success', data: instances });
  } catch (error) {
    console.error('Get workflow instances error:', error);
    res.status(500).json({ error: 'Failed to fetch workflow instances' });
  }
});

app.post('/api/v1/workflows/instances', requirePermission('workflow:execute'), async (req, res) => {
  try {
    const { workflowId, contentId, metadata } = req.body;

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { stages: { orderBy: { order: 'asc' } } }
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const instance = await prisma.workflowInstance.create({
      data: {
        workflowId,
        contentId,
        status: 'PENDING',
        currentStageId: workflow.stages[0]?.id,
        metadata: JSON.stringify(metadata || {}),
        startedBy: req.user.id
      },
      include: {
        workflow: true,
        content: {
          select: { id: true, title: true }
        }
      }
    });

    res.json({ status: 'success', data: instance });
  } catch (error) {
    console.error('Create workflow instance error:', error);
    res.status(500).json({ error: 'Failed to create workflow instance' });
  }
});

app.post('/api/v1/workflows/instances/:id/approve', requireAuth, async (req, res) => {
  try {
    const { comments } = req.body;
    const instanceId = req.params.id;

    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: {
          include: { stages: { orderBy: { order: 'asc' } } }
        }
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Workflow instance not found' });
    }

    // Create approval record
    await prisma.approval.create({
      data: {
        workflowInstanceId: instanceId,
        stageId: instance.currentStageId,
        approvedById: req.user.id,
        status: 'APPROVED',
        comments
      }
    });

    // Find next stage
    const currentStageIndex = instance.workflow.stages.findIndex(
      s => s.id === instance.currentStageId
    );
    const nextStage = instance.workflow.stages[currentStageIndex + 1];

    // Update instance
    const updatedInstance = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        currentStageId: nextStage?.id,
        status: nextStage ? 'IN_PROGRESS' : 'COMPLETED',
        completedAt: nextStage ? undefined : new Date()
      },
      include: {
        workflow: true,
        content: {
          select: { id: true, title: true }
        },
        approvals: {
          include: {
            approvedBy: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    res.json({ status: 'success', data: updatedInstance });
  } catch (error) {
    console.error('Approve workflow error:', error);
    res.status(500).json({ error: 'Failed to approve workflow' });
  }
});

app.post('/api/v1/workflows/instances/:id/reject', requireAuth, async (req, res) => {
  try {
    const { comments } = req.body;
    const instanceId = req.params.id;

    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Workflow instance not found' });
    }

    // Create rejection record
    await prisma.approval.create({
      data: {
        workflowInstanceId: instanceId,
        stageId: instance.currentStageId,
        approvedById: req.user.id,
        status: 'REJECTED',
        comments
      }
    });

    // Update instance
    const updatedInstance = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: 'REJECTED',
        completedAt: new Date()
      },
      include: {
        workflow: true,
        content: {
          select: { id: true, title: true }
        },
        approvals: {
          include: {
            approvedBy: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    res.json({ status: 'success', data: updatedInstance });
  } catch (error) {
    console.error('Reject workflow error:', error);
    res.status(500).json({ error: 'Failed to reject workflow' });
  }
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

server.listen(PORT, () => {
  console.log(`🚀 TradeKeep CMS Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Status: http://localhost:${PORT}/api/v1/status`);
  if (socketServer) {
    console.log(`📡 WebSocket server initialized for real-time collaboration`);
  }
});