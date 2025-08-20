'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { 
  Save, X, Upload, Image, FileText, Video, 
  Calendar, Clock, Tag, Target, Share2
} from 'lucide-react';
import { Asset, Content } from '@/types';

interface ContentData {
  title: string;
  content: string;
  type: 'POST' | 'ARTICLE' | 'STORY';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  scheduledAt?: string;
  platforms: string[];
  tags: string[];
}

interface EnhancedContentEditorProps {
  initialData?: Partial<ContentData>;
  onSave: (data: ContentData) => Promise<void>;
  onCancel: () => void;
  contentId?: string;
}

export function EnhancedContentEditor({ 
  initialData, 
  onSave, 
  onCancel,
  contentId 
}: EnhancedContentEditorProps) {
  const [data, setData] = useState<ContentData>({
    title: '',
    content: '',
    type: 'POST',
    status: 'DRAFT',
    platforms: [],
    tags: [],
    ...initialData,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'}/api/v1/assets`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (response.ok) {
        const result = await response.json();
        setAssets(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.title.trim() || !data.content.trim()) {
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

  const insertAsset = (asset: Asset) => {
    const assetMarkdown = asset.mimeType.startsWith('image/') 
      ? `![${asset.originalName}](${asset.url})`
      : `[${asset.originalName}](${asset.url})`;
    
    setData({ ...data, content: data.content + '\n\n' + assetMarkdown });
    setShowAssetPicker(false);
  };

  const addTag = () => {
    if (newTag.trim() && !data.tags.includes(newTag.trim())) {
      setData({ ...data, tags: [...data.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setData({ ...data, tags: data.tags.filter(tag => tag !== tagToRemove) });
  };

  const togglePlatform = (platform: string) => {
    const platforms = data.platforms.includes(platform)
      ? data.platforms.filter(p => p !== platform)
      : [...data.platforms, platform];
    setData({ ...data, platforms });
  };

  const typeOptions = [
    { value: 'POST', label: 'Social Media Post' },
    { value: 'ARTICLE', label: 'Article/Blog Post' },
    { value: 'STORY', label: 'Story Content' }
  ];

  const statusOptions = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'ARCHIVED', label: 'Archived' }
  ];

  const platformOptions = [
    { value: 'twitter', label: 'Twitter/X', icon: '𝕏' },
    { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { value: 'instagram', label: 'Instagram', icon: '📷' },
    { value: 'facebook', label: 'Facebook', icon: '👥' },
    { value: 'youtube', label: 'YouTube', icon: '📺' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {contentId ? 'Edit Content' : 'Create New Content'}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                className="flex items-center gap-2"
              >
                <X size={16} />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Save size={16} />
                {loading ? 'Saving...' : 'Save Content'}
              </Button>
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Title
            </label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter a compelling title..."
              required
            />
          </div>

          {/* Type and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                value={data.type}
                onChange={(e) => setData({ ...data, type: e.target.value as ContentData['type'] })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {typeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={data.status}
                onChange={(e) => setData({ ...data, status: e.target.value as ContentData['status'] })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scheduling */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock size={16} className="inline mr-1" />
              Schedule Publication (Optional)
            </label>
            <input
              type="datetime-local"
              value={data.scheduledAt || ''}
              onChange={(e) => setData({ ...data, scheduledAt: e.target.value })}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content Editor */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Content Body</h3>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAssetPicker(true)}
              className="flex items-center gap-2"
            >
              <Upload size={16} />
              Insert Asset
            </Button>
          </div>

          <RichTextEditor
            value={data.content}
            onChange={(content) => setData({ ...data, content })}
            placeholder="Start writing your content..."
            minHeight={400}
          />
        </div>

        {/* Platforms */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <Share2 size={16} className="inline mr-2" />
            Publishing Platforms
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {platformOptions.map(platform => (
              <label
                key={platform.value}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={data.platforms.includes(platform.value)}
                  onChange={() => togglePlatform(platform.value)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">
                  {platform.icon} {platform.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <Tag size={16} className="inline mr-2" />
            Tags
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {data.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Add a tag..."
            />
            <Button type="button" onClick={addTag}>Add Tag</Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-md">
            {error}
          </div>
        )}
      </form>

      {/* Asset Picker Modal */}
      {showAssetPicker && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Asset</h3>
              <Button
                variant="secondary"
                onClick={() => setShowAssetPicker(false)}
              >
                <X size={16} />
              </Button>
            </div>
            
            {assets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No assets available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => insertAsset(asset)}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                      {asset.mimeType.startsWith('image/') ? (
                        <img 
                          src={asset.url} 
                          alt={asset.originalName}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : asset.mimeType.startsWith('video/') ? (
                        <Video size={24} className="text-gray-400" />
                      ) : (
                        <FileText size={24} className="text-gray-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 truncate">{asset.originalName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}