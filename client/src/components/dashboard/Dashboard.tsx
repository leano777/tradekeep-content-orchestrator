'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Content } from '@/types';

interface DashboardStats {
  totalContent: number;
  publishedContent: number;
  scheduledContent: number;
  draftContent: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalContent: 0,
    publishedContent: 0,
    scheduledContent: 0,
    draftContent: 0,
  });
  const [recentContent, setRecentContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const [statsRes, contentRes] = await Promise.all([
        fetch('http://localhost:9001/api/v1/dashboard/stats', { headers }),
        fetch('http://localhost:9001/api/v1/content?limit=5', { headers }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data || stats);
      }

      if (contentRes.ok) {
        const contentData = await contentRes.json();
        setRecentContent(contentData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pillarColors = {
    'internal-os': 'bg-blue-500',
    'psychology': 'bg-purple-500',
    'discipline': 'bg-red-500',
    'systems': 'bg-green-500',
  };

  const statusVariants = {
    'draft': 'default',
    'review': 'warning',
    'approved': 'info',
    'scheduled': 'info',
    'published': 'success',
  } as const;

  if (loading) {
    return <LoadingSpinner size="lg" className="mt-12" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Welcome to TradeKeep Content Orchestrator
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalContent}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.publishedContent}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.scheduledContent}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {stats.draftContent}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Content</CardTitle>
        </CardHeader>
        <CardContent>
          {recentContent.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No content yet. Create your first piece of content to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {recentContent.map((content) => (
                <div
                  key={content.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {content.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={`w-3 h-3 rounded-full ${pillarColors[content.pillar]}`} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {content.pillar.replace('-', ' ').toUpperCase()}
                      </span>
                      <Badge variant={statusVariants[content.status]}>
                        {content.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(content.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Content by Pillar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(pillarColors).map(([pillar, color]) => (
                <div key={pillar} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${color}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {pillar.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <a
                href="/content/create"
                className="block w-full px-4 py-2 text-center bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create New Content
              </a>
              <a
                href="/calendar"
                className="block w-full px-4 py-2 text-center bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                View Calendar
              </a>
              <a
                href="/assets"
                className="block w-full px-4 py-2 text-center bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Manage Assets
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}