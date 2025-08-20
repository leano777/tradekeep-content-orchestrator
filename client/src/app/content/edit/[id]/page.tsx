'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import CollaborativeEditor from '@/components/collaboration/CollaborativeEditor';
import CommentsPanel from '@/components/collaboration/CommentsPanel';
import ActivityFeed from '@/components/collaboration/ActivityFeed';
import PresenceIndicator from '@/components/collaboration/PresenceIndicator';
import NotificationCenter from '@/components/collaboration/NotificationCenter';
import { initSocket } from '@/lib/socket';

export default function EditContentPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const contentId = params.id as string;

  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<'comments' | 'activity'>('comments');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        initSocket(token);
      }
      fetchContent();
    }
  }, [user, contentId]);

  const fetchContent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'}/api/v1/content/${contentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContent(data);
        setTitle(data.title);
        setBody(data.body || '');
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'}/api/v1/content/${contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          body
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save content');
      }

      // Show success notification
      alert('Content saved successfully!');
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save content');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner size="lg" className="min-h-screen" />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoginForm />
      </div>
    );
  }

  if (!content) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-700">Content not found</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                placeholder="Untitled Content"
              />
              <PresenceIndicator contentId={contentId} currentUserId={user.id} />
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className="flex-1 p-6 overflow-y-auto">
            <CollaborativeEditor
              contentId={contentId}
              initialContent={body}
              onChange={setBody}
              placeholder="Start writing your content..."
            />
          </div>

          {/* Side Panel */}
          <div className="w-96 border-l border-gray-200 bg-gray-50 flex flex-col">
            {/* Panel Tabs */}
            <div className="flex border-b border-gray-200 bg-white">
              <button
                onClick={() => setActivePanel('comments')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activePanel === 'comments'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Comments
              </button>
              <button
                onClick={() => setActivePanel('activity')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activePanel === 'activity'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Activity
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
              {activePanel === 'comments' ? (
                <CommentsPanel contentId={contentId} />
              ) : (
                <ActivityFeed contentId={contentId} />
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}