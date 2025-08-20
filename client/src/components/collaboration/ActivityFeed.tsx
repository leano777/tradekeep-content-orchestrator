'use client';

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { getSocket } from '@/lib/socket';

interface Activity {
  id: string;
  type: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  contentId?: string;
  details?: any;
  createdAt: string;
}

interface ActivityFeedProps {
  contentId?: string;
  limit?: number;
}

const ACTIVITY_ICONS: Record<string, string> = {
  'content-created': '📝',
  'content-updated': '✏️',
  'content-published': '🚀',
  'comment-added': '💬',
  'user-joined': '👋',
  'user-left': '👋',
  'status-changed': '🔄',
  'asset-uploaded': '📎',
  'campaign-created': '📅',
  'email-sent': '📧'
};

const ACTIVITY_MESSAGES: Record<string, (activity: Activity) => string> = {
  'content-created': (a) => `created new content`,
  'content-updated': (a) => `updated the content`,
  'content-published': (a) => `published the content`,
  'comment-added': (a) => `added a comment`,
  'user-joined': (a) => `joined the collaboration`,
  'user-left': (a) => `left the collaboration`,
  'status-changed': (a) => `changed status to ${a.details?.newStatus}`,
  'asset-uploaded': (a) => `uploaded an asset`,
  'campaign-created': (a) => `created a new campaign`,
  'email-sent': (a) => `sent an email campaign`
};

export default function ActivityFeed({ contentId, limit = 20 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    const socket = getSocket();
    if (socket) {
      socket.on('new-activity', (activity: Activity) => {
        if (!contentId || activity.contentId === contentId) {
          setActivities(prev => [activity, ...prev].slice(0, limit));
        }
      });

      return () => {
        socket.off('new-activity');
      };
    }
  }, [contentId, limit]);

  const fetchActivities = async () => {
    try {
      const url = contentId 
        ? `/api/v1/activities?contentId=${contentId}&limit=${limit}`
        : `/api/v1/activities?limit=${limit}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityMessage = (activity: Activity) => {
    const getMessage = ACTIVITY_MESSAGES[activity.type];
    return getMessage ? getMessage(activity) : activity.type;
  };

  const getActivityIcon = (type: string) => {
    return ACTIVITY_ICONS[type] || '📋';
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Activity Feed</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No activity yet</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="text-2xl flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-semibold text-sm">
                      {activity.user.name || activity.user.email}
                    </span>
                    <span className="text-sm text-gray-600">
                      {getActivityMessage(activity)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}