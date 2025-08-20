'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Calendar, TrendingUp, Users, Eye, Heart, MessageCircle, Share2, DollarSign } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';

interface AnalyticsData {
  overview: {
    totalContent: number;
    totalViews: number;
    totalEngagement: number;
    conversionRate: number;
  };
  contentPerformance: Array<{
    id: string;
    title: string;
    views: number;
    engagement: number;
    platform: string;
    publishedAt: string;
  }>;
  platformStats: Array<{
    platform: string;
    posts: number;
    engagement: number;
    color: string;
  }>;
  engagementOverTime: Array<{
    date: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
  }>;
  emailStats: {
    totalSubscribers: number;
    campaignsSent: number;
    openRate: number;
    clickRate: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const dashboardResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'}/api/v1/dashboard/stats`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        }
      });
      
      if (!dashboardResponse.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const dashboardData = await dashboardResponse.json();
      
      // Mock additional analytics data (would be real API calls in production)
      const mockData: AnalyticsData = {
        overview: {
          totalContent: dashboardData.data.totalContent || 0,
          totalViews: Math.floor(Math.random() * 50000) + 10000,
          totalEngagement: Math.floor(Math.random() * 5000) + 1000,
          conversionRate: parseFloat((Math.random() * 5 + 2).toFixed(2))
        },
        contentPerformance: [
          {
            id: '1',
            title: 'How to Master Social Media Marketing',
            views: 12500,
            engagement: 850,
            platform: 'LinkedIn',
            publishedAt: '2024-01-15'
          },
          {
            id: '2', 
            title: 'The Future of Content Creation',
            views: 9800,
            engagement: 720,
            platform: 'Twitter',
            publishedAt: '2024-01-12'
          },
          {
            id: '3',
            title: 'Building Your Personal Brand',
            views: 15200,
            engagement: 1200,
            platform: 'Instagram',
            publishedAt: '2024-01-10'
          },
          {
            id: '4',
            title: 'Content Strategy Best Practices',
            views: 8900,
            engagement: 650,
            platform: 'LinkedIn',
            publishedAt: '2024-01-08'
          }
        ],
        platformStats: [
          { platform: 'LinkedIn', posts: 24, engagement: 3200, color: '#0077B5' },
          { platform: 'Twitter', posts: 18, engagement: 2100, color: '#1DA1F2' },
          { platform: 'Instagram', posts: 15, engagement: 2800, color: '#E4405F' },
          { platform: 'Facebook', posts: 12, engagement: 1900, color: '#1877F2' }
        ],
        engagementOverTime: [
          { date: '2024-01-01', views: 2400, likes: 240, comments: 45, shares: 12 },
          { date: '2024-01-02', views: 1398, likes: 180, comments: 32, shares: 8 },
          { date: '2024-01-03', views: 9800, likes: 890, comments: 120, shares: 45 },
          { date: '2024-01-04', views: 3908, likes: 420, comments: 78, shares: 22 },
          { date: '2024-01-05', views: 4800, likes: 510, comments: 65, shares: 18 },
          { date: '2024-01-06', views: 3800, likes: 380, comments: 55, shares: 15 },
          { date: '2024-01-07', views: 4300, likes: 450, comments: 72, shares: 28 }
        ],
        emailStats: {
          totalSubscribers: 1245,
          campaignsSent: 8,
          openRate: 24.5,
          clickRate: 3.2
        }
      };
      
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Failed to load analytics data</p>
          <Button onClick={fetchAnalyticsData} className="mt-4">
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Track your content performance and engagement metrics</p>
          </div>
          <div className="flex space-x-2">
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <Button variant="secondary">Export Report</Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.overview.totalViews.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Engagement</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.overview.totalEngagement.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Content Pieces</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.overview.totalContent}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.overview.conversionRate}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Engagement Over Time */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.engagementOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="views" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="likes" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                <Area type="monotone" dataKey="comments" stackId="1" stroke="#ffc658" fill="#ffc658" />
                <Area type="monotone" dataKey="shares" stackId="1" stroke="#ff7300" fill="#ff7300" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Platform Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.platformStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ platform, posts }) => `${platform}: ${posts}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="posts"
                >
                  {analyticsData.platformStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Content */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Content</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.contentPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="views" fill="#8884d8" />
                <Bar dataKey="engagement" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Email Campaign Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Campaign Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Subscribers</span>
                <span className="text-2xl font-bold text-gray-900">
                  {analyticsData.emailStats.totalSubscribers}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Campaigns Sent</span>
                <span className="text-2xl font-bold text-gray-900">
                  {analyticsData.emailStats.campaignsSent}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Open Rate</span>
                <span className="text-2xl font-bold text-green-600">
                  {analyticsData.emailStats.openRate}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Click Rate</span>
                <span className="text-2xl font-bold text-blue-600">
                  {analyticsData.emailStats.clickRate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Performance Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Content Performance Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engagement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Published
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.contentPerformance.map((content) => (
                  <tr key={content.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{content.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {content.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {content.views.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {content.engagement.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(content.publishedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}