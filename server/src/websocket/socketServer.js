const { Server: SocketIOServer } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { sanitizeComment, sanitizeActivityDetails } = require('../utils/sanitizer');
const { EventRateLimiters } = require('../utils/rateLimiter');

const prisma = new PrismaClient();

class SocketServer {
  constructor(server) {
    this.rooms = new Map();
    this.rateLimiters = new EventRateLimiters();
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.user = {
          userId: user.id,
          email: user.email,
          role: user.role
        };

        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.user;
      console.log(`User ${user.email} connected`);

      // Join content editing room
      socket.on('join-content', async (contentId) => {
        // Rate limiting check
        if (!this.rateLimiters.checkEvent('join-content', socket.id)) {
          socket.emit('error', { message: 'Rate limit exceeded. Please try again later.' });
          return;
        }
        
        socket.join(`content:${contentId}`);
        
        if (!this.rooms.has(contentId)) {
          this.rooms.set(contentId, {
            contentId,
            users: new Map()
          });
        }

        const room = this.rooms.get(contentId);
        room.users.set(user.userId, { socketId: socket.id, user });

        // Notify others in the room
        socket.to(`content:${contentId}`).emit('user-joined', {
          userId: user.userId,
          email: user.email,
          role: user.role
        });

        // Send current users to the new joiner
        const activeUsers = Array.from(room.users.values()).map(u => ({
          userId: u.user.userId,
          email: u.user.email,
          role: u.user.role,
          cursor: u.cursor
        }));
        socket.emit('active-users', activeUsers);
      });

      // Leave content editing room
      socket.on('leave-content', (contentId) => {
        socket.leave(`content:${contentId}`);
        this.handleUserLeaveRoom(contentId, user.userId, socket);
      });

      // Handle content changes (collaborative editing)
      socket.on('content-change', async (data) => {
        // Rate limiting check
        if (!this.rateLimiters.checkEvent('content-change', socket.id)) {
          socket.emit('error', { message: 'Too many changes. Please slow down.' });
          return;
        }
        
        // Broadcast changes to all other users in the room
        socket.to(`content:${data.contentId}`).emit('content-update', {
          userId: user.userId,
          changes: data.changes,
          version: data.version
        });

        // Save to database periodically (debounced on client)
        if (data.version % 10 === 0) {
          try {
            await prisma.content.update({
              where: { id: data.contentId },
              data: {
                body: data.changes.content,
                updatedAt: new Date()
              }
            });
          } catch (error) {
            console.error('Error saving content:', error);
          }
        }
      });

      // Handle cursor position updates
      socket.on('cursor-update', (data) => {
        // Rate limiting check
        if (!this.rateLimiters.checkEvent('cursor-update', socket.id)) {
          // Silently drop cursor updates when rate limited (too frequent to show errors)
          return;
        }
        
        const room = this.rooms.get(data.contentId);
        if (room && room.users.has(user.userId)) {
          room.users.get(user.userId).cursor = {
            line: data.line,
            column: data.column
          };

          socket.to(`content:${data.contentId}`).emit('cursor-position', {
            userId: user.userId,
            email: user.email,
            line: data.line,
            column: data.column
          });
        }
      });

      // Handle comments
      socket.on('add-comment', async (data) => {
        // Rate limiting check
        if (!this.rateLimiters.checkEvent('add-comment', socket.id)) {
          socket.emit('error', { message: 'Too many comments. Please wait before posting again.' });
          return;
        }
        
        try {
          // Sanitize comment text to prevent XSS
          const sanitizedText = sanitizeComment(data.text);
          
          const comment = await prisma.comment.create({
            data: {
              text: sanitizedText,
              contentId: data.contentId,
              userId: user.userId,
              parentId: data.parentId
            },
            include: {
              user: {
                select: { id: true, email: true, name: true }
              }
            }
          });

          // Broadcast new comment to all users in the room
          this.io.to(`content:${data.contentId}`).emit('new-comment', comment);

          // Create notifications for mentioned users
          if (data.mentions && data.mentions.length > 0) {
            const notifications = data.mentions.map(mentionedUserId => ({
              type: 'MENTION',
              message: `${user.email} mentioned you in a comment`,
              userId: mentionedUserId,
              contentId: data.contentId,
              read: false
            }));

            await prisma.notification.createMany({
              data: notifications
            });

            // Send real-time notifications
            data.mentions.forEach(mentionedUserId => {
              const mentionedUser = Array.from(this.rooms.get(data.contentId)?.users.values() || [])
                .find(u => u.user.userId === mentionedUserId);
              
              if (mentionedUser) {
                this.io.to(mentionedUser.socketId).emit('notification', {
                  type: 'mention',
                  from: user.email,
                  contentId: data.contentId,
                  message: `${user.email} mentioned you in a comment`
                });
              }
            });
          }
        } catch (error) {
          console.error('Error adding comment:', error);
          socket.emit('error', { message: 'Failed to add comment' });
        }
      });

      // Handle activity tracking
      socket.on('activity', async (data) => {
        // Rate limiting check
        if (!this.rateLimiters.checkEvent('activity', socket.id)) {
          // Silently drop activity tracking when rate limited
          return;
        }
        
        try {
          // Sanitize activity details
          const sanitizedDetails = sanitizeActivityDetails(data.details || {});
          
          const activity = await prisma.activity.create({
            data: {
              type: data.type,
              userId: user.userId,
              contentId: data.contentId,
              details: JSON.stringify(sanitizedDetails)
            },
            include: {
              user: {
                select: { id: true, email: true, name: true }
              }
            }
          });

          // Broadcast activity to relevant users
          if (data.contentId) {
            this.io.to(`content:${data.contentId}`).emit('new-activity', activity);
          } else {
            // Broadcast to all connected users (for global activities)
            this.io.emit('new-activity', activity);
          }
        } catch (error) {
          console.error('Error tracking activity:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${user.email} disconnected`);
        
        // Clean up rate limiter for this client
        this.rateLimiters.resetClient(socket.id);
        
        // Remove user from all rooms
        this.rooms.forEach((room, contentId) => {
          if (room.users.has(user.userId)) {
            this.handleUserLeaveRoom(contentId, user.userId, socket);
          }
        });
      });
    });
  }

  handleUserLeaveRoom(contentId, userId, socket) {
    const room = this.rooms.get(contentId);
    if (room) {
      room.users.delete(userId);
      
      // Notify others that user left
      socket.to(`content:${contentId}`).emit('user-left', { userId });

      // Clean up empty rooms
      if (room.users.size === 0) {
        this.rooms.delete(contentId);
      }
    }
  }
}

module.exports = { SocketServer };