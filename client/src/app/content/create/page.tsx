'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ContentEditor } from '@/components/content/ContentEditor';
import { ContentTemplates } from '@/components/content/ContentTemplates';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  PlusIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface ContentTemplate {
  id: string;
  title: string;
  description: string;
  brandPillar: 'TRUST' | 'EXPERTISE' | 'INNOVATION' | 'COMMUNITY';
  contentType: 'BLOG_POST' | 'EMAIL' | 'SOCIAL_MEDIA' | 'DOCUMENTATION' | 'LANDING_PAGE';
  template: string;
  tags: string[];
  estimatedTime: number;
  targetAudience: string[];
  seoKeywords: string[];
}

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

export default function CreateContentPage() {
  const [mode, setMode] = useState<'template' | 'blank' | 'editor'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [contentData, setContentData] = useState<Partial<ContentItem> | null>(null);

  const handleTemplateSelect = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    setContentData({
      title: `[Draft] ${template.title}`,
      content: template.template,
      type: template.contentType,
      status: 'DRAFT',
      tags: template.tags,
      brandPillar: template.brandPillar,
      targetAudience: template.targetAudience,
      seoKeywords: template.seoKeywords,
      linkedAssets: [],
      metadata: {
        wordCount: 0,
        readingTime: 0,
        lastModified: new Date()
      }
    });
    setMode('editor');
  };

  const handleStartBlank = () => {
    setSelectedTemplate(null);
    setContentData({
      title: '',
      content: '',
      type: 'BLOG_POST',
      status: 'DRAFT',
      tags: [],
      linkedAssets: [],
      metadata: {
        wordCount: 0,
        readingTime: 0,
        lastModified: new Date()
      }
    });
    setMode('editor');
  };

  const handleSave = async (content: ContentItem) => {
    // TODO: Implement API call to save content
    console.log('Saving content:', content);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Content saved successfully!');
  };

  const handlePublish = async (content: ContentItem) => {
    // TODO: Implement API call to publish content
    console.log('Publishing content:', content);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Content published successfully!');
  };

  const handlePreview = (content: ContentItem) => {
    // TODO: Implement preview functionality
    console.log('Previewing content:', content);
    alert('Preview functionality coming soon!');
  };

  const goBack = () => {
    if (mode === 'editor') {
      setMode('template');
      setContentData(null);
      setSelectedTemplate(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {mode === 'editor' && (
              <Button variant="ghost" onClick={goBack}>
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">
                {mode === 'template' ? 'Create Content' : mode === 'editor' ? 'Content Editor' : 'Create Content'}
              </h1>
              <p className="text-tk-gray-400">
                {mode === 'template' 
                  ? 'Choose a template or start from scratch to create engaging content.'
                  : mode === 'editor' 
                    ? selectedTemplate 
                      ? `Creating content from "${selectedTemplate.title}" template`
                      : 'Creating content from scratch'
                    : 'Create new content for TradeKeep'
                }
              </p>
            </div>
          </div>

          {mode === 'template' && (
            <Button variant="primary" onClick={handleStartBlank}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Start Blank
            </Button>
          )}
        </div>

        {/* Content based on mode */}
        {mode === 'template' && (
          <>
            {/* Quick Start Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="hover:border-tk-blue-500 transition-colors cursor-pointer" onClick={handleStartBlank}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-tk-gray-800 rounded-lg flex items-center justify-center">
                      <DocumentTextIcon className="w-6 h-6 text-tk-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Start from Scratch</h3>
                      <p className="text-sm text-tk-gray-400">Create original content with complete creative freedom</p>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-tk-gray-400">
                      Perfect for unique content ideas and custom messaging
                    </div>
                    <Button variant="ghost" size="sm">
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <Card className="hover:border-tk-blue-500 transition-colors">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-tk-blue-600 rounded-lg flex items-center justify-center">
                      <SparklesIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Use Templates</h3>
                      <p className="text-sm text-tk-gray-400">Accelerate creation with pre-built brand-aligned templates</p>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-tk-gray-400">
                      Optimized for TradeKeep's brand pillars and messaging
                    </div>
                    <div className="text-sm text-tk-blue-400 font-medium">
                      Browse below ↓
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Templates */}
            <ContentTemplates onSelectTemplate={handleTemplateSelect} />
          </>
        )}

        {mode === 'editor' && contentData && (
          <ContentEditor
            initialContent={contentData}
            onSave={handleSave}
            onPublish={handlePublish}
            onPreview={handlePreview}
          />
        )}

        {/* Quick Tips Card - Only show on template selection screen */}
        {mode === 'template' && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">Content Creation Tips</h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-white mb-2">🎯 Brand Alignment</h4>
                  <p className="text-tk-gray-400">
                    Choose templates that align with TradeKeep's brand pillars: Trust, Expertise, Innovation, and Community.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">📊 Asset Integration</h4>
                  <p className="text-tk-gray-400">
                    Link relevant assets from your cloud storage to enhance content without database bloat.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">🔍 SEO Optimization</h4>
                  <p className="text-tk-gray-400">
                    Use the built-in SEO keyword tools to improve search visibility and reach.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">📝 Content Planning</h4>
                  <p className="text-tk-gray-400">
                    Schedule content publication and set up approval workflows for consistent quality.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}