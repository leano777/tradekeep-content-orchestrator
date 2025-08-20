'use client';

import React, { useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';

interface ActiveUser {
  userId: string;
  email: string;
  role: string;
  cursor?: {
    line: number;
    column: number;
  };
}

interface PresenceIndicatorProps {
  contentId: string;
  currentUserId: string;
}

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-orange-500'
];

export default function PresenceIndicator({ contentId, currentUserId }: PresenceIndicatorProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  useEffect(() => {
    const socket = getSocket();
    
    if (socket) {
      // Join the content room
      socket.emit('join-content', contentId);

      // Listen for active users
      socket.on('active-users', (users: ActiveUser[]) => {
        setActiveUsers(users.filter(u => u.userId !== currentUserId));
      });

      // Listen for user joined
      socket.on('user-joined', (user: ActiveUser) => {
        setActiveUsers(prev => {
          if (prev.find(u => u.userId === user.userId)) return prev;
          return [...prev, user];
        });
      });

      // Listen for user left
      socket.on('user-left', ({ userId }: { userId: string }) => {
        setActiveUsers(prev => prev.filter(u => u.userId !== userId));
      });

      // Listen for cursor positions
      socket.on('cursor-position', (data: { userId: string; email: string; line: number; column: number }) => {
        setActiveUsers(prev => prev.map(user => {
          if (user.userId === data.userId) {
            return {
              ...user,
              cursor: { line: data.line, column: data.column }
            };
          }
          return user;
        }));
      });

      return () => {
        socket.emit('leave-content', contentId);
        socket.off('active-users');
        socket.off('user-joined');
        socket.off('user-left');
        socket.off('cursor-position');
      };
    }
  }, [contentId, currentUserId]);

  const getUserColor = (userId: string) => {
    const index = userId.charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  };

  const getInitials = (email: string) => {
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 mr-2">Active now:</span>
      <div className="flex -space-x-2">
        {activeUsers.slice(0, 5).map((user, index) => (
          <div
            key={user.userId}
            className={`w-8 h-8 rounded-full ${getUserColor(user.userId)} flex items-center justify-center text-white text-xs font-semibold border-2 border-white relative`}
            style={{ zIndex: activeUsers.length - index }}
            title={user.email}
          >
            {getInitials(user.email)}
            {user.cursor && (
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 rounded-full border border-white animate-pulse" />
            )}
          </div>
        ))}
        {activeUsers.length > 5 && (
          <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-semibold border-2 border-white">
            +{activeUsers.length - 5}
          </div>
        )}
      </div>
      <div className="ml-2 text-sm text-gray-600">
        {activeUsers.length} {activeUsers.length === 1 ? 'collaborator' : 'collaborators'}
      </div>
    </div>
  );
}