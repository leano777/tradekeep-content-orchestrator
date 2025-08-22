const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { requireAuth } = require('../middleware/permissions');

// Create task
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, type, priority, assigneeId, contentId, parentId, dueDate } = req.body;
    
    const task = await prisma.task.create({
      data: {
        title,
        description,
        type: type || 'CUSTOM',
        priority: priority || 'MEDIUM',
        assigneeId,
        createdBy: req.user.id,
        contentId,
        parentId,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    });
    
    // Send notification to assignee
    if (assigneeId !== req.user.id) {
      await prisma.notification.create({
        data: {
          type: 'ASSIGNMENT',
          message: `${req.user.name} assigned you a task: ${title}`,
          userId: assigneeId,
          taskId: task.id
        }
      });
    }
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get user's tasks
router.get('/my-tasks', requireAuth, async (req, res) => {
  try {
    const { status, priority, type } = req.query;
    
    const where = {
      OR: [
        { assigneeId: req.user.id },
        { createdBy: req.user.id }
      ]
    };
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    
    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        creator: { select: { id: true, name: true, email: true } },
        content: { select: { id: true, title: true, type: true } },
        subtasks: true
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

// Update task status
router.patch('/:taskId/status', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { creator: true }
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check permission (assignee or creator can update)
    if (task.assigneeId !== req.user.id && task.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }
    
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    });
    
    // Notify creator if task completed by assignee
    if (status === 'COMPLETED' && task.assigneeId === req.user.id && task.createdBy !== req.user.id) {
      await prisma.notification.create({
        data: {
          type: 'STATUS_CHANGE',
          message: `${req.user.name} completed task: ${task.title}`,
          userId: task.createdBy,
          taskId: task.id
        }
      });
    }
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Update task details
router.put('/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, priority, assigneeId, dueDate } = req.body;
    
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check permission
    if (task.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Only task creator can edit task details' });
    }
    
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title,
        description,
        priority,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    });
    
    // Notify new assignee if changed
    if (assigneeId && assigneeId !== task.assigneeId) {
      await prisma.notification.create({
        data: {
          type: 'ASSIGNMENT',
          message: `${req.user.name} assigned you a task: ${title}`,
          userId: assigneeId,
          taskId: task.id
        }
      });
    }
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Only creator can delete
    if (task.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Only task creator can delete task' });
    }
    
    await prisma.task.delete({ where: { id: taskId } });
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Task deletion error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get task statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [total, todo, inProgress, completed, overdue] = await Promise.all([
      prisma.task.count({ where: { assigneeId: req.user.id } }),
      prisma.task.count({ where: { assigneeId: req.user.id, status: 'TODO' } }),
      prisma.task.count({ where: { assigneeId: req.user.id, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { assigneeId: req.user.id, status: 'COMPLETED' } }),
      prisma.task.count({
        where: {
          assigneeId: req.user.id,
          status: { not: 'COMPLETED' },
          dueDate: { lt: new Date() }
        }
      })
    ]);
    
    res.json({
      total,
      todo,
      inProgress,
      completed,
      overdue,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
});

module.exports = router;