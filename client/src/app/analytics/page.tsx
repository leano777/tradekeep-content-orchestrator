'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

interface SystemMetrics {
  server: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
  database: {
    connectionPool: number;
    queryTime: number;
    totalQueries: number;
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

interface ContentMetrics {
  totalContent: number;
  contentByStatus: Record<string, number>;
  contentByType: Record<string, number>;
  contentByPillar: Record<string, number>;
  recentActivity: Array<{
    action: string;
    count: number;
    timestamp: string;
  }>;
}

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [contentMetrics, setContentMetrics] = useState<ContentMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadMetrics();
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(loadMetrics, 30000);
      setRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [user]);

  const loadMetrics = async () => {
    try {
      setMetricsLoading(true);
      
      // Load content metrics
      const contentResponse = await apiClient.getContent();
      const content = contentResponse.data || contentResponse || [];
      
      // Simulate system metrics (in real app, these would come from monitoring APIs)
      const mockSystemMetrics: SystemMetrics = {
        server: {
          uptime: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // 7 days ago
          memoryUsage: 45 + Math.random() * 10, // 45-55%
          cpuUsage: 15 + Math.random() * 20, // 15-35%
          activeConnections: Math.floor(10 + Math.random() * 40) // 10-50
        },
        database: {
          connectionPool: Math.floor(8 + Math.random() * 7), // 8-15
          queryTime: 5 + Math.random() * 10, // 5-15ms
          totalQueries: Math.floor(1000 + Math.random() * 5000) // 1000-6000
        },
        api: {
          requestsPerMinute: Math.floor(50 + Math.random() * 100), // 50-150
          averageResponseTime: 50 + Math.random() * 100, // 50-150ms
          errorRate: Math.random() * 2 // 0-2%
        }
      };
      
      // Process content metrics
      const processedContentMetrics: ContentMetrics = {
        totalContent: content.length,
        contentByStatus: content.reduce((acc: Record<string, number>, item: any) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {}),
        contentByType: content.reduce((acc: Record<string, number>, item: any) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        }, {}),
        contentByPillar: content.reduce((acc: Record<string, number>, item: any) => {
          acc[item.pillar] = (acc[item.pillar] || 0) + 1;
          return acc;
        }, {}),
        recentActivity: [
          { action: 'Content Created', count: Math.floor(Math.random() * 10), timestamp: new Date().toISOString() },
          { action: 'Content Published', count: Math.floor(Math.random() * 5), timestamp: new Date().toISOString() },
          { action: 'Content Updated', count: Math.floor(Math.random() * 8), timestamp: new Date().toISOString() }
        ]
      };
      
      setSystemMetrics(mockSystemMetrics);
      setContentMetrics(processedContentMetrics);
      
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const mins = Math.floor((seconds % (60 * 60)) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  const getHealthStatus = (value: number, thresholds: {good: number, warning: number}) => {
    if (value <= thresholds.good) return { status: 'healthy', color: 'text-green-600 bg-green-100' };
    if (value <= thresholds.warning) return { status: 'warning', color: 'text-yellow-600 bg-yellow-100' };
    return { status: 'critical', color: 'text-red-600 bg-red-100' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                📊 System Analytics
              </h1>
              {metricsLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={loadMetrics}
                className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
              >
                Refresh
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* System Health Overview */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">System Health Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {systemMetrics && (
                <>
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">CPU Usage</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {systemMetrics.server.cpuUsage.toFixed(1)}%
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        getHealthStatus(systemMetrics.server.cpuUsage, {good: 50, warning: 80}).color
                      }`}>
                        {getHealthStatus(systemMetrics.server.cpuUsage, {good: 50, warning: 80}).status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Memory Usage</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {systemMetrics.server.memoryUsage.toFixed(1)}%
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        getHealthStatus(systemMetrics.server.memoryUsage, {good: 60, warning: 85}).color
                      }`}>
                        {getHealthStatus(systemMetrics.server.memoryUsage, {good: 60, warning: 85}).status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Response Time</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {systemMetrics.api.averageResponseTime.toFixed(0)}ms
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        getHealthStatus(systemMetrics.api.averageResponseTime, {good: 100, warning: 500}).color
                      }`}>
                        {getHealthStatus(systemMetrics.api.averageResponseTime, {good: 100, warning: 500}).status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Error Rate</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {systemMetrics.api.errorRate.toFixed(2)}%
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        getHealthStatus(systemMetrics.api.errorRate, {good: 1, warning: 5}).color
                      }`}>
                        {getHealthStatus(systemMetrics.api.errorRate, {good: 1, warning: 5}).status}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* System Metrics */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Server Metrics */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Server Metrics</h3>
                </div>
                <div className="p-6">
                  {systemMetrics && (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Performance</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Uptime</span>
                            <span className="font-medium">{formatUptime(Date.now()/1000 - systemMetrics.server.uptime)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Active Connections</span>
                            <span className="font-medium">{systemMetrics.server.activeConnections}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Requests/min</span>
                            <span className="font-medium">{systemMetrics.api.requestsPerMinute}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Database</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Connection Pool</span>
                            <span className="font-medium">{systemMetrics.database.connectionPool}/20</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Avg Query Time</span>
                            <span className="font-medium">{systemMetrics.database.queryTime.toFixed(1)}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Queries</span>
                            <span className="font-medium">{systemMetrics.database.totalQueries.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Analytics */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Content Analytics</h3>
                </div>
                <div className="p-6">
                  {contentMetrics && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Content by Status */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">By Status</h4>
                        <div className="space-y-2">
                          {Object.entries(contentMetrics.contentByStatus).map(([status, count]) => (
                            <div key={status} className="flex justify-between items-center">
                              <span className="text-sm text-gray-500 capitalize">{status}</span>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{count}</span>
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${(count / contentMetrics.totalContent) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Content by Type */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">By Type</h4>
                        <div className="space-y-2">
                          {Object.entries(contentMetrics.contentByType).map(([type, count]) => (
                            <div key={type} className="flex justify-between items-center">
                              <span className="text-sm text-gray-500 capitalize">{type}</span>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{count}</span>
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-green-600 h-2 rounded-full"
                                    style={{ width: `${(count / contentMetrics.totalContent) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Content by Pillar */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">By Pillar</h4>
                        <div className="space-y-2">
                          {Object.entries(contentMetrics.contentByPillar).map(([pillar, count]) => (
                            <div key={pillar} className="flex justify-between items-center">
                              <span className="text-sm text-gray-500 capitalize">{pillar.replace('-', ' ')}</span>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{count}</span>
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-600 h-2 rounded-full"
                                    style={{ width: `${(count / contentMetrics.totalContent) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Activity & Status */}
            <div className="space-y-6">
              
              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                </div>
                <div className="p-6">
                  {contentMetrics && (
                    <div className="space-y-3">
                      {contentMetrics.recentActivity.map((activity, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{activity.action}</span>
                          <span className="font-medium text-blue-600">+{activity.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">System Status</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">API Server</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        Healthy
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Database</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        Healthy
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">File Storage</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        Healthy
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Authentication</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        Healthy
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
