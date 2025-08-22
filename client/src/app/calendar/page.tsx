'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

interface CalendarContent {
  id: string;
  title: string;
  type: string;
  status: string;
  pillar: string;
  platform?: string;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  author: {
    name: string;
  };
}

interface CalendarDay {
  date: Date;
  content: CalendarContent[];
  isCurrentMonth: boolean;
}

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [content, setContent] = useState<CalendarContent[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadContent();
    }
  }, [user, currentDate]);

  useEffect(() => {
    generateCalendar();
  }, [currentDate, content]);

  const loadContent = async () => {
    try {
      setContentLoading(true);
      const response = await apiClient.getContent();
      setContent(response.data || response || []);
    } catch (error) {
      console.error('Failed to load content:', error);
      setContent([]);
    } finally {
      setContentLoading(false);
    }
  };

  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of the month
    const firstDay = new Date(year, month, 1);
    
    // Get first day of the week (Sunday = 0)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayContent = content.filter(item => {
        const contentDate = new Date(item.scheduledAt || item.publishedAt || item.createdAt);
        return (
          contentDate.getFullYear() === date.getFullYear() &&
          contentDate.getMonth() === date.getMonth() &&
          contentDate.getDate() === date.getDate()
        );
      });
      
      days.push({
        date: new Date(date),
        content: dayContent,
        isCurrentMonth: date.getMonth() === month
      });
    }
    
    setCalendarDays(days);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-yellow-100 border-yellow-300',
      published: 'bg-green-100 border-green-300',
      scheduled: 'bg-blue-100 border-blue-300',
      review: 'bg-orange-100 border-orange-300',
      archived: 'bg-gray-100 border-gray-300'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 border-gray-300';
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      post: '📝',
      article: '📄',
      email: '✉️',
      newsletter: '📧',
      social: '📱',
      SOCIAL_POST: '📱'
    };
    return icons[type as keyof typeof icons] || '📝';
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
                📅 Content Calendar
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/content/create')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Create Content
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
          {/* Calendar Header */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    ←
                  </button>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currentDate.toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </h2>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    →
                  </button>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                  >
                    Today
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-[120px] p-2 border rounded-md cursor-pointer transition-colors ${
                      day.isCurrentMonth 
                        ? 'bg-white border-gray-200 hover:bg-gray-50' 
                        : 'bg-gray-50 border-gray-100 text-gray-400'
                    } ${
                      day.date.toDateString() === new Date().toDateString()
                        ? 'ring-2 ring-blue-500'
                        : ''
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-medium ${
                        day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {day.date.getDate()}
                      </span>
                      {day.content.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                          {day.content.length}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {day.content.slice(0, 3).map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className={`text-xs p-1 rounded border-l-2 ${getStatusColor(item.status)}`}
                          title={item.title}
                        >
                          <div className="flex items-center space-x-1">
                            <span>{getTypeIcon(item.type)}</span>
                            <span className="truncate flex-1">
                              {item.title.length > 15 
                                ? item.title.substring(0, 15) + '...' 
                                : item.title
                              }
                            </span>
                          </div>
                        </div>
                      ))}
                      {day.content.length > 3 && (
                        <div className="text-xs text-gray-500 p-1">
                          +{day.content.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Upcoming Content
                  </h3>
                </div>
                <div className="p-6">
                  {contentLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="flex items-center space-x-4">
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {content
                        .filter(item => item.status === 'scheduled' && item.scheduledAt && new Date(item.scheduledAt) > new Date())
                        .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
                        .slice(0, 5)
                        .map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{getTypeIcon(item.type)}</span>
                              <div>
                                <div className="font-medium text-gray-900">{item.title}</div>
                                <div className="text-sm text-gray-500">
                                  {item.scheduledAt && new Date(item.scheduledAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {item.platform || item.type}
                              </span>
                            </div>
                          </div>
                        ))
                      }
                      {content.filter(item => item.status === 'scheduled').length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">📅</div>
                          <p>No scheduled content</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    This Month
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Published</span>
                    <span className="font-medium text-green-600">
                      {content.filter(item => {
                        const date = new Date(item.publishedAt || '');
                        return item.status === 'published' && 
                               date.getMonth() === currentDate.getMonth() &&
                               date.getFullYear() === currentDate.getFullYear();
                      }).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Scheduled</span>
                    <span className="font-medium text-blue-600">
                      {content.filter(item => {
                        const date = new Date(item.scheduledAt || '');
                        return item.status === 'scheduled' && 
                               date.getMonth() === currentDate.getMonth() &&
                               date.getFullYear() === currentDate.getFullYear();
                      }).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Drafts</span>
                    <span className="font-medium text-yellow-600">
                      {content.filter(item => item.status === 'draft').length}
                    </span>
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
