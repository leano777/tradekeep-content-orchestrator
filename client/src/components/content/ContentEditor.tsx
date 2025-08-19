'use client';

import { useState, useRef, useCallback } from 'react';
import { 
  PencilSquareIcon,
  PhotoIcon,
  LinkIcon,
  BookmarkIcon,
  CalendarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  CheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { CloudAssetBrowser } from '@/components/assets/CloudAssetBrowser';

interface ContentItem {
  id?: string;
  title: string;
  content: string;
  type: 'BLOG_POST' | 'EMAIL' | 'SOCIAL_MEDIA' | 'DOCUMENTATION' | 'LANDING_PAGE';
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  category?: string;
  tags: string[];
  scheduledFor?: Date;
  brandPillar?: 'TRUST' | 'EXPERTISE' | 'INNOVATION' | 'COMMUNITY';
  targetAudience?: string[];
  seoKeywords?: string[];
  linkedAssets: string[];
  metadata: {
    wordCount: number;
    readingTime: number;
    lastModified: Date;
  };
}

interface ContentEditorProps {
  initialContent?: Partial<ContentItem>;
  onSave?: (content: ContentItem) => void;
  onPublish?: (content: ContentItem) => void;
  onPreview?: (content: ContentItem) => void;
  className?: string;
}

const BRAND_PILLARS = [
  { key: 'TRUST', label: 'Trust & Reliability', color: 'bg-blue-600' },
  { key: 'EXPERTISE', label: 'Expert Knowledge', color: 'bg-green-600' },
  { key: 'INNOVATION', label: 'Innovation & Growth', color: 'bg-purple-600' },
  { key: 'COMMUNITY', label: 'Community Focus', color: 'bg-orange-600' }
];

const CONTENT_TYPES = [
  { key: 'BLOG_POST', label: 'Blog Post', icon: DocumentTextIcon },
  { key: 'EMAIL', label: 'Email Campaign', icon: '@' },
  { key: 'SOCIAL_MEDIA', label: 'Social Media', icon: '#' },
  { key: 'DOCUMENTATION', label: 'Documentation', icon: BookmarkIcon },
  { key: 'LANDING_PAGE', label: 'Landing Page', icon: PencilSquareIcon }
];

export function ContentEditor({ 
  initialContent, 
  onSave, 
  onPublish, 
  onPreview,
  className 
}: ContentEditorProps) {
  const [content, setContent] = useState<ContentItem>({
    title: initialContent?.title || '',
    content: initialContent?.content || '',
    type: initialContent?.type || 'BLOG_POST',
    status: initialContent?.status || 'DRAFT',
    tags: initialContent?.tags || [],
    linkedAssets: initialContent?.linkedAssets || [],
    brandPillar: initialContent?.brandPillar,
    targetAudience: initialContent?.targetAudience || [],
    seoKeywords: initialContent?.seoKeywords || [],
    metadata: {
      wordCount: 0,
      readingTime: 0,
      lastModified: new Date()
    },
    ...initialContent
  });

  const [showAssetBrowser, setShowAssetBrowser] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'assets'>('content');
  
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Calculate word count and reading time
  const updateMetadata = useCallback((text: string) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    setContent(prev => ({
      ...prev,
      content: text,
      metadata: {
        ...prev.metadata,
        wordCount,
        readingTime,
        lastModified: new Date()
      }
    }));
  }, []);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateMetadata(e.target.value);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !content.tags.includes(newTag.trim())) {
      setContent(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setContent(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !content.seoKeywords?.includes(newKeyword.trim())) {
      setContent(prev => ({
        ...prev,
        seoKeywords: [...(prev.seoKeywords || []), newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setContent(prev => ({
      ...prev,
      seoKeywords: prev.seoKeywords?.filter(keyword => keyword !== keywordToRemove) || []
    }));
  };

  const handleAssetLink = (asset: any) => {
    const assetId = `${asset.provider}-${asset.id}`;
    if (!content.linkedAssets.includes(assetId)) {
      setContent(prev => ({
        ...prev,
        linkedAssets: [...prev.linkedAssets, assetId]
      }));
    }
    
    // Insert asset reference at cursor position
    if (contentRef.current) {
      const textarea = contentRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentContent = textarea.value;
      
      const assetReference = `[Asset: ${asset.name}](${assetId})`;
      const newContent = currentContent.substring(0, start) + assetReference + currentContent.substring(end);
      
      updateMetadata(newContent);
      
      // Reset cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + assetReference.length, start + assetReference.length);
      }, 0);
    }
    
    setShowAssetBrowser(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.(content);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    const publishContent = {
      ...content,
      status: 'PUBLISHED' as const
    };
    await onPublish?.(publishContent);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-600';
      case 'REVIEW': return 'bg-yellow-600';
      case 'APPROVED': return 'bg-green-600';
      case 'PUBLISHED': return 'bg-blue-600';
      case 'ARCHIVED': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Input
                placeholder="Content title..."
                value={content.title}
                onChange={(e) => setContent(prev => ({ ...prev, title: e.target.value }))}
                className="text-xl font-semibold bg-transparent border-none text-white placeholder-tk-gray-400"
                style={{ fontSize: '1.25rem' }}
              />
              <Badge className={getStatusColor(content.status)}>
                {content.status}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => onPreview?.(content)}>
                <EyeIcon className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <LoadingSpinner size="sm" /> : <CheckIcon className="w-4 h-4 mr-2" />}
                Save Draft
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                onClick={handlePublish}
                disabled={!content.title.trim() || !content.content.trim()}
              >
                Publish
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-tk-gray-700">
        <nav className="flex space-x-8">
          {[
            { key: 'content', label: 'Content', icon: PencilSquareIcon },
            { key: 'settings', label: 'Settings', icon: ClockIcon },
            { key: 'assets', label: 'Assets', icon: PhotoIcon }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center px-3 py-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-tk-blue-500 text-tk-blue-400'
                  : 'border-transparent text-tk-gray-400 hover:text-tk-gray-300 hover:border-tk-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">Content</h3>
              </CardHeader>
              <CardBody>
                <RichTextEditor
                  value={content.content}
                  onChange={(value) => updateMetadata(value)}
                  placeholder="Start writing your content..."
                  onAssetLink={() => setShowAssetBrowser(true)}
                  minHeight={384}
                />
                
                <div className="flex items-center justify-between mt-4 text-sm text-tk-gray-400">
                  <div className="flex items-center space-x-4">
                    <span>{content.metadata.wordCount} words</span>
                    <span>{content.metadata.readingTime} min read</span>
                    <span>Last saved: {content.metadata.lastModified.toLocaleTimeString()}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
          
          {/* Content Sidebar */}
          <div className="space-y-6">
            {/* Brand Pillar */}
            <Card>
              <CardHeader>
                <h4 className="font-semibold text-white">Brand Pillar</h4>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-2">
                  {BRAND_PILLARS.map(pillar => (
                    <button
                      key={pillar.key}
                      onClick={() => setContent(prev => ({ 
                        ...prev, 
                        brandPillar: prev.brandPillar === pillar.key ? undefined : pillar.key as any
                      }))}
                      className={`p-2 text-xs rounded text-center transition-all ${
                        content.brandPillar === pillar.key
                          ? `${pillar.color} text-white`
                          : 'bg-tk-gray-800 text-tk-gray-400 hover:bg-tk-gray-700'
                      }`}
                    >
                      {pillar.label}
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <h4 className="font-semibold text-white">Tags</h4>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      size="sm"
                    />
                    <Button variant="ghost" size="sm" onClick={handleAddTag}>
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {content.tags.map(tag => (
                      <Badge key={tag} className="bg-tk-gray-700">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-red-400"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <h4 className="font-semibold text-white">Quick Stats</h4>
              </CardHeader>
              <CardBody>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-tk-gray-400">Type:</span>
                    <span className="text-white capitalize">{content.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tk-gray-400">Assets:</span>
                    <span className="text-white">{content.linkedAssets.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tk-gray-400">Tags:</span>
                    <span className="text-white">{content.tags.length}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">Content Settings</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-tk-gray-300 mb-2">
                    Content Type
                  </label>
                  <select
                    value={content.type}
                    onChange={(e) => setContent(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full p-2 bg-tk-gray-800 border border-tk-gray-700 rounded text-white"
                  >
                    {CONTENT_TYPES.map(type => (
                      <option key={type.key} value={type.key}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-tk-gray-300 mb-2">
                    Category
                  </label>
                  <Input
                    placeholder="Content category..."
                    value={content.category || ''}
                    onChange={(e) => setContent(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-tk-gray-300 mb-2">
                    Scheduled Publication
                  </label>
                  <Input
                    type="datetime-local"
                    value={content.scheduledFor ? content.scheduledFor.toISOString().slice(0, 16) : ''}
                    onChange={(e) => setContent(prev => ({ 
                      ...prev, 
                      scheduledFor: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                  />
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">SEO Keywords</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add SEO keyword..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                  />
                  <Button variant="ghost" size="sm" onClick={handleAddKeyword}>
                    <PlusIcon className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {content.seoKeywords?.map(keyword => (
                    <Badge key={keyword} className="bg-tk-blue-700">
                      {keyword}
                      <button
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="ml-2 hover:text-red-400"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">Linked Assets</h3>
            <p className="text-tk-gray-400 text-sm">
              Assets linked to this content will be referenced without being stored in the database.
            </p>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {content.linkedAssets.length > 0 && (
                <div>
                  <h4 className="font-medium text-white mb-3">Currently Linked ({content.linkedAssets.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {content.linkedAssets.map(assetId => (
                      <div key={assetId} className="p-3 bg-tk-gray-800 rounded-lg border border-tk-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white truncate">{assetId.split('-')[1]}</span>
                          <button
                            onClick={() => setContent(prev => ({
                              ...prev,
                              linkedAssets: prev.linkedAssets.filter(id => id !== assetId)
                            }))}
                            className="text-tk-gray-400 hover:text-red-400"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <Button
                variant="primary"
                onClick={() => setShowAssetBrowser(true)}
                className="w-full"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Browse & Link Assets
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Asset Browser Modal */}
      {showAssetBrowser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-tk-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-tk-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Select Assets to Link</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAssetBrowser(false)}>
                <XMarkIcon className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 max-h-[calc(90vh-100px)] overflow-auto">
              <CloudAssetBrowser
                onAssetSelect={handleAssetLink}
                fileTypes={['jpg', 'jpeg', 'png', 'webp', 'svg', 'pdf', 'mp4', 'mov']}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}