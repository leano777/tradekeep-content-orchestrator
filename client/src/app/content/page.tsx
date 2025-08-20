'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Content } from '@/types';
import Link from 'next/link';

export default function ContentPage() {
  const { user, loading } = useAuth();
  const [content, setContent] = useState<Content[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pillarFilter, setPillarFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchContent();
    }
  }, [user]);

  const fetchContent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:9001/api/v1/content', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setContent(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setContentLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-screen" />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoginForm />
      </div>
    );
  }

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesPillar = pillarFilter === 'all' || item.pillar === pillarFilter;
    
    return matchesSearch && matchesStatus && matchesPillar;
  });

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'published', label: 'Published' },
  ];

  const pillarOptions = [
    { value: 'all', label: 'All Pillars' },
    { value: 'internal-os', label: '🧠 Internal Operating System' },
    { value: 'psychology', label: '🔬 Psychology Over Strategy' },
    { value: 'discipline', label: '⚡ Discipline Over Dopamine' },
    { value: 'systems', label: '🎯 Systems vs Reactive Trading' },
  ];

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Content Library</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage and organize your content
            </p>
          </div>
          <Link href="/content/create">
            <Button>+ Create Content</Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={statusOptions}
                className="w-full sm:w-40"
              />
              <Select
                value={pillarFilter}
                onChange={(e) => setPillarFilter(e.target.value)}
                options={pillarOptions}
                className="w-full sm:w-48"
              />
            </div>
          </CardContent>
        </Card>

        {contentLoading ? (
          <LoadingSpinner size="lg" className="py-12" />
        ) : filteredContent.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {content.length === 0 ? 'No content yet' : 'No content found'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {content.length === 0 
                  ? 'Create your first piece of content to get started.'
                  : 'Try adjusting your search terms or filters.'
                }
              </p>
              {content.length === 0 && (
                <Link href="/content/create">
                  <Button>Create Content</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContent.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={statusVariants[item.status]}>
                      {item.status}
                    </Badge>
                    <div className={`w-3 h-3 rounded-full ${pillarColors[item.pillar]}`} />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                    {item.body.slice(0, 120)}...
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Pillar:</span>
                      <span className="text-gray-900 dark:text-white">
                        {item.pillar.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Type:</span>
                      <span className="text-gray-900 dark:text-white">{item.type}</span>
                    </div>
                    
                    {item.platform && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Platform:</span>
                        <Badge variant="info">{item.platform}</Badge>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Created:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Edit
                    </Button>
                    <Button size="sm" className="flex-1">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredContent.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Showing {filteredContent.length} of {content.length} items
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}