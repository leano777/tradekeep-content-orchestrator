'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

interface DashboardStats {
  overview: {
    totalContent: number;
    publishedContent: number;
    draftContent: number;
    scheduledContent: number;
  };
  engagement: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
  };
  topContent: Array<{
    id: string;
    title: string;
    views: number;
    engagement: number;
  }>;
  recentActivity: Array<{
    type: string;
    contentId?: string;
    userId: string;
    timestamp: string;
  }>;
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadDashboardStats();
    }
  }, [user]);

  const loadDashboardStats = async () => {
    try {
      const data = await apiClient.getDashboardAnalytics();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      // Set default stats if API fails
      setStats({
        overview: { totalContent: 0, publishedContent: 0, draftContent: 0, scheduledContent: 0 },
        engagement: { totalViews: 0, totalLikes: 0, totalShares: 0, totalComments: 0 },
        topContent: [],
        recentActivity: []
      });
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                🚀 TK Content Orchestrator
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-700">{user.name}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {user.role}
                </span>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => router.push('/content')}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Content
                </button>
                <button
                  onClick={() => router.push('/content/create')}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Create
                </button>
                <button
                  onClick={logout}
                  className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}!</h2>
            <p className="text-gray-600">Here's what's happening with your content today.</p>
          </div>

          {statsLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
                  <div className="p-5">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                          <span className="text-blue-600 font-medium">📝</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Content
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats?.overview?.totalContent || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                          <span className="text-green-600 font-medium">✅</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Published
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats?.overview?.publishedContent || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                          <span className="text-yellow-600 font-medium">📄</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Drafts
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats?.overview?.draftContent || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                          <span className="text-purple-600 font-medium">⏰</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Scheduled
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats?.overview?.scheduledContent || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white shadow rounded-lg mb-8">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <button
                      onClick={() => router.push('/content/create')}
                      className="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-4 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <span className="text-2xl mb-2 block">📝</span>
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Create New Content
                      </span>
                    </button>

                    <button
                      onClick={() => router.push('/calendar')}
                      className="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-4 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <span className="text-2xl mb-2 block">📅</span>
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Content Calendar
                      </span>
                    </button>

                    <button
                      onClick={() => router.push('/analytics')}
                      className="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-4 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <span className="text-2xl mb-2 block">📊</span>
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Analytics
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Recent Activity
                  </h3>
                  {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                    <div className="flow-root">
                      <ul className="-mb-8">
                        {stats.recentActivity.map((activity, activityIdx) => (
                          <li key={activityIdx}>
                            <div className="relative pb-8">
                              {activityIdx !== stats.recentActivity.length - 1 ? (
                                <span
                                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                  aria-hidden="true"
                                />
                              ) : null}
                              <div className="relative flex space-x-3">
                                <div>
                                  <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-white">
                                    <span className="text-blue-600 text-sm">📝</span>
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                  <div>
                                    <p className="text-sm text-gray-500">
                                      {activity.type.replace(/_/g, ' ')}
                                    </p>
                                  </div>
                                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                    <time dateTime={activity.timestamp}>
                                      {new Date(activity.timestamp).toLocaleDateString()}
                                    </time>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
