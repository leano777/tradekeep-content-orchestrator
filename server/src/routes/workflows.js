const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { requireAuth, requirePermission } = require('../middleware/permissions');

// Create workflow template
router.post('/templates', requirePermission('workflow:create'), async (req, res) => {
  try {
    const { name, description, type, stages } = req.body;
    
    const workflow = await prisma.$transaction(async (tx) => {
      // Create workflow
      const newWorkflow = await tx.workflow.create({
        data: {
          name,
          description,
          type,
          createdBy: req.user.id,
          stages: {
            create: stages.map((stage, index) => ({
              name: stage.name,
              order: index,
              type: stage.type,
              assigneeRole: stage.assigneeRole,
              assigneeId: stage.assigneeId,
              config: JSON.stringify(stage.config || {})
            }))
          }
        },
        include: {
          stages: true
        }
      });
      
      return newWorkflow;
    });
    
    res.status(201).json(workflow);
  } catch (error) {
    console.error('Workflow creation error:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Start workflow instance
router.post('/start', requireAuth, async (req, res) => {
  try {
    const { workflowId, contentId, metadata } = req.body;
    
    // Get workflow with stages
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
        metadata: JSON.stringify(metadata || {}),
        startedBy: req.user.id
      }
    });
    
    // Create first approval request if needed
    if (workflow.stages.length > 0 && workflow.stages[0].type === 'APPROVAL') {
      const firstStage = workflow.stages[0];
      
      // Notify assignee
      await createApprovalNotification(instance.id, firstStage, req.user.id);
    }
    
    res.status(201).json(instance);
  } catch (error) {
    console.error('Workflow start error:', error);
    res.status(500).json({ error: 'Failed to start workflow' });
  }
});

// Process approval
router.post('/approve/:instanceId', requireAuth, async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { action, comments, stageId } = req.body;
    
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
    const approval = await prisma.approval.create({
      data: {
        instanceId,
        stageId,
        userId: req.user.id,
        action,
        comments
      }
    });
    
    // Update instance based on action
    if (action === 'APPROVED') {
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
        
        // Auto-publish content if configured
        if (instance.contentId) {
          await autoPublishContent(instance.contentId);
        }
      } else {
        // Move to next stage
        await prisma.workflowInstance.update({
          where: { id: instanceId },
          data: { currentStage: nextStageIndex }
        });
        
        // Notify next approver
        const nextStage = instance.workflow.stages[nextStageIndex];
        await createApprovalNotification(instanceId, nextStage, req.user.id);
      }
    } else if (action === 'REJECTED') {
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'REJECTED' }
      });
    }
    
    res.json({ approval, instance: await prisma.workflowInstance.findUnique({ where: { id: instanceId } }) });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Failed to process approval' });
  }
});

// Get pending approvals for user
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const instances = await prisma.workflowInstance.findMany({
      where: {
        status: 'IN_PROGRESS',
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
      },
      include: {
        workflow: { include: { stages: true } },
        content: true,
        approvals: true
      }
    });
    
    // Filter to only instances waiting for this user's approval
    const pending = instances.filter(instance => {
      const currentStage = instance.workflow.stages[instance.currentStage];
      if (!currentStage) return false;
      
      const hasApproved = instance.approvals.some(
        a => a.stageId === currentStage.id && a.userId === req.user.id
      );
      
      return !hasApproved && (
        currentStage.assigneeId === req.user.id ||
        currentStage.assigneeRole === req.user.role
      );
    });
    
    res.json(pending);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// Helper functions
async function createApprovalNotification(instanceId, stage, requesterId) {
  const requester = await prisma.user.findUnique({ where: { id: requesterId } });
  
  if (stage.assigneeId) {
    await prisma.notification.create({
      data: {
        type: 'APPROVAL_REQUEST',
        message: `${requester.name} requested your approval for ${stage.name}`,
        userId: stage.assigneeId
      }
    });
  } else if (stage.assigneeRole) {
    // Notify all users with the required role
    const users = await prisma.user.findMany({ where: { role: stage.assigneeRole } });
    
    await prisma.notification.createMany({
      data: users.map(user => ({
        type: 'APPROVAL_REQUEST',
        message: `${requester.name} requested ${stage.assigneeRole} approval for ${stage.name}`,
        userId: user.id
      }))
    });
  }
}

async function autoPublishContent(contentId) {
  await prisma.content.update({
    where: { id: contentId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date()
    }
  });
}

module.exports = router;