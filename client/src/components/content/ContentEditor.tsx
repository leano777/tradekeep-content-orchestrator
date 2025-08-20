'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface ContentData {
  title: string;
  body: string;
  type: 'post' | 'email' | 'social';
  pillar: 'internal-os' | 'psychology' | 'discipline' | 'systems';
  platform?: 'instagram' | 'twitter' | 'linkedin' | 'email';
  status: 'draft' | 'review' | 'approved' | 'scheduled' | 'published';
  scheduledAt?: string;
}

interface ContentEditorProps {
  initialData?: Partial<ContentData>;
  onSave: (data: ContentData) => Promise<void>;
  onCancel: () => void;
}

export function ContentEditor({ initialData, onSave, onCancel }: ContentEditorProps) {
  const [data, setData] = useState<ContentData>({
    title: '',
    body: '',
    type: 'post',
    pillar: 'internal-os',
    status: 'draft',
    ...initialData,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pillarOptions = [
    { value: 'internal-os', label: '🧠 Internal Operating System' },
    { value: 'psychology', label: '🔬 Psychology Over Strategy' },
    { value: 'discipline', label: '⚡ Discipline Over Dopamine' },
    { value: 'systems', label: '🎯 Systems vs Reactive Trading' },
  ];

  const typeOptions = [
    { value: 'post', label: 'Blog Post' },
    { value: 'social', label: 'Social Media' },
    { value: 'email', label: 'Email Content' },
  ];

  const platformOptions = [
    { value: '', label: 'Select Platform', disabled: true },
    { value: 'instagram', label: 'Instagram' },
    { value: 'twitter', label: 'Twitter/X' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'email', label: 'Email' },
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'Ready for Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'scheduled', label: 'Scheduled' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.title.trim() || !data.body.trim()) {
      setError('Title and content are required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onSave(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save content');
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

  const characterCount = data.body.length;
  const isTwitter = data.platform === 'twitter';
  const twitterLimit = 280;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Content Details</CardTitle>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${pillarColors[data.pillar]}`} />
              <Badge>{data.pillar.replace('-', ' ').toUpperCase()}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Title"
            value={data.title}
            onChange={(e) => setData({ ...data, title: e.target.value })}
            placeholder="Enter content title..."
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Content Type"
              value={data.type}
              onChange={(e) => setData({ ...data, type: e.target.value as ContentData['type'] })}
              options={typeOptions}
            />

            <Select
              label="Brand Pillar"
              value={data.pillar}
              onChange={(e) => setData({ ...data, pillar: e.target.value as ContentData['pillar'] })}
              options={pillarOptions}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Platform"
              value={data.platform || ''}
              onChange={(e) => setData({ ...data, platform: e.target.value as ContentData['platform'] })}
              options={platformOptions}
            />

            <Select
              label="Status"
              value={data.status}
              onChange={(e) => setData({ ...data, status: e.target.value as ContentData['status'] })}
              options={statusOptions}
            />
          </div>

          {data.status === 'scheduled' && (
            <Input
              label="Scheduled Date & Time"
              type="datetime-local"
              value={data.scheduledAt || ''}
              onChange={(e) => setData({ ...data, scheduledAt: e.target.value })}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Content Body</CardTitle>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {characterCount} characters
              {isTwitter && (
                <span className={characterCount > twitterLimit ? 'text-red-500' : 'text-green-500'}>
                  {' '}({twitterLimit - characterCount} remaining)
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.body}
            onChange={(e) => setData({ ...data, body: e.target.value })}
            placeholder="Write your content here..."
            className="min-h-[300px]"
            required
          />
          
          {isTwitter && characterCount > twitterLimit && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Content exceeds Twitter character limit
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Content'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}