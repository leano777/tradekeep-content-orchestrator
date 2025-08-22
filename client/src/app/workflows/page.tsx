'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

interface WorkflowInstance {
  id: string;
  workflowId: string;
  contentId: string;
  currentStage: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  startedAt: string;
  completedAt?: string;
  content?: {
    id: string;
    title: string;
    type: string;
    author: {
      name: string;
    };
  };
  stages?: Array<{
    id: string;
    name: string;
    order: number;
    type: string;
    assigneeRole?: string;
    completed: boolean;
  }>;
}

interface ContentRecommendation {
  id: string;
  title: string;
  description: string;
  pillar: string;
  type: string;
  reasoning: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  suggestedKeywords: string[];
  estimatedTime: string;
}

const MOCK_WORKFLOWS: WorkflowInstance[] = [
  {
    id: 'wf1',
    workflowId: 'approval-workflow',
    contentId: 'c1',
    currentStage: 1,
    status: 'IN_PROGRESS',
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    content: {
      id: 'c1',
      title: 'Building Your Trading Psychology Foundation',
      type: 'post',
      author: { name: 'Content Team' }
    },
    stages: [
      { id: 's1', name: 'Content Review', order: 0, type: 'REVIEW', assigneeRole: 'MANAGER', completed: true },
      { id: 's2', name: 'Brand Compliance Check', order: 1, type: 'APPROVAL', assigneeRole: 'ADMIN', completed: false },
      { id: 's3', name: 'Final Approval', order: 2, type: 'APPROVAL', assigneeRole: 'ADMIN', completed: false }
    ]
  },
  {
    id: 'wf2',
    workflowId: 'content-approval',
    contentId: 'c2',
    currentStage: 0,
    status: 'PENDING',
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    content: {
      id: 'c2',
      title: 'Systems vs Reactive Trading Mindset',
      type: 'newsletter',
      author: { name: 'Editorial Team' }
    },
    stages: [
      { id: 's4', name: 'Initial Review', order: 0, type: 'REVIEW', assigneeRole: 'EDITOR', completed: false },
      { id: 's5', name: 'Content Approval', order: 1, type: 'APPROVAL', assigneeRole: 'MANAGER', completed: false }
    ]
  }
];

const CONTENT_RECOMMENDATIONS: ContentRecommendation[] = [
  {
    id: 'r1',
    title: 'The Discipline Deficit: Why Most Traders Fail',
    description: 'Deep dive into the psychological reasons why discipline is the #1 factor separating successful from unsuccessful traders',
    pillar: 'discipline-over-dopamine',
    type: 'article',
    reasoning: 'High engagement topic based on recent user interactions with discipline-related content',
    priority: 'HIGH',
    suggestedKeywords: ['trading discipline', 'emotional control', 'self-regulation', 'trading psychology'],
    estimatedTime: '45 minutes'
  },
  {
    id: 'r2',
    title: 'Building Your Personal Trading Operating System',
    description: 'Step-by-step guide to creating systematic approaches that replace emotional decision-making',
    pillar: 'internal-os',
    type: 'email series',
    reasoning: 'Aligns with core brand pillar and provides actionable value to subscribers',
    priority: 'MEDIUM',
    suggestedKeywords: ['trading systems', 'decision framework', 'methodology', 'consistent profits'],
    estimatedTime: '60 minutes'
  },
  {
    id: 'r3',
    title: 'Weekly Market Mindset Recap',
    description: 'Quick social posts highlighting key psychological lessons from this week\'s market moves',
    pillar: 'systems-vs-reactive',
    type: 'social',
    reasoning: 'Regular content cadence needed for social media engagement',
    priority: 'MEDIUM',
    suggestedKeywords: ['market psychology', 'trading lessons', 'systematic thinking'],
    estimatedTime: '20 minutes'
  }
];

export default function WorkflowsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);
  const [activeTab, setActiveTab] = useState<'workflows' | 'recommendations'>('workflows');
  const [workflowsLoading, setWorkflowsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadWorkflows();
      loadRecommendations();
    }
  }, [user]);

  const loadWorkflows = async () => {
    try {
      setWorkflowsLoading(true);
      // In real app, this would be: await apiClient.getWorkflows();
      setWorkflows(MOCK_WORKFLOWS);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setWorkflowsLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      // In real app, this would use ML/AI algorithms to generate recommendations
      setRecommendations(CONTENT_RECOMMENDATIONS);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const handleApproval = async (workflowId: string, action: 'approve' | 'reject', comments?: string) => {
    try {
      // await apiClient.processWorkflow(workflowId, { action, comments });
      // Mock approval
      setWorkflows(prev => prev.map(wf => 
        wf.id === workflowId 
          ? { ...wf, currentStage: action === 'approve' ? wf.currentStage + 1 : wf.currentStage, status: action === 'approve' ? 'IN_PROGRESS' : 'REJECTED' as any }
          : wf
      ));
    } catch (error) {
      console.error('Failed to process workflow:', error);
    }
  };

  const createContentFromRecommendation = async (recommendation: ContentRecommendation) => {
    try {
      const contentData = {
        title: recommendation.title,
        body: recommendation.description + '\n\n[Generated from AI recommendation - expand with full content]',
        type: recommendation.type,
        pillar: recommendation.pillar,
        status: 'draft'
      };
      
      await apiClient.createContent(contentData);
      router.push('/content/create');
    } catch (error) {
      console.error('Failed to create content from recommendation:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'IN_PROGRESS': 'bg-blue-100 text-blue-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'COMPLETED': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'LOW': 'bg-gray-100 text-gray-800',
      'MEDIUM': 'bg-blue-100 text-blue-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'URGENT': 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
                🔄 Workflows & AI Recommendations
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
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
          
          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('workflows')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'workflows'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Active Workflows ({workflows.filter(w => w.status !== 'COMPLETED').length})
                </button>
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'recommendations'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  AI Content Recommendations ({recommendations.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Workflows Tab */}
          {activeTab === 'workflows' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Content Approval Workflows</h2>
                  <p className="text-sm text-gray-500 mt-1">Manage content through review and approval processes</p>
                </div>
                <div className="p-6">
                  {workflowsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="flex items-center space-x-4">
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : workflows.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-4xl mb-4">🔄</div>
                      <p>No active workflows</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {workflows.map((workflow) => (
                        <div key={workflow.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-medium text-gray-900">
                                  {workflow.content?.title}
                                </h3>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(workflow.status)}`}>
                                  {workflow.status}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {workflow.content?.type}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                                <span>By {workflow.content?.author.name}</span>
                                <span>Started {new Date(workflow.startedAt).toLocaleDateString()}</span>
                              </div>
                              
                              {/* Workflow Progress */}
                              <div className="mb-4">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-sm font-medium text-gray-700">Progress:</span>
                                  <span className="text-sm text-gray-500">
                                    Stage {workflow.currentStage + 1} of {workflow.stages?.length}
                                  </span>
                                </div>
                                <div className="flex space-x-2">
                                  {workflow.stages?.map((stage, index) => (
                                    <div key={stage.id} className="flex-1">
                                      <div
                                        className={`h-2 rounded-full ${
                                          index <= workflow.currentStage
                                            ? stage.completed 
                                              ? 'bg-green-500' 
                                              : 'bg-blue-500'
                                            : 'bg-gray-200'
                                        }`}
                                      />
                                      <div className="text-xs text-gray-500 mt-1 truncate">
                                        {stage.name}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Current Stage Info */}
                              {workflow.stages && workflow.currentStage < workflow.stages.length && (
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="font-medium text-blue-900">
                                        Current: {workflow.stages[workflow.currentStage]?.name}
                                      </span>
                                      <p className="text-sm text-blue-700">
                                        Assigned to: {workflow.stages[workflow.currentStage]?.assigneeRole}
                                      </p>
                                    </div>
                                    {(user.role === 'ADMIN' || user.role === workflow.stages[workflow.currentStage]?.assigneeRole) && (
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={() => handleApproval(workflow.id, 'approve')}
                                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleApproval(workflow.id, 'reject')}
                                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">AI Content Recommendations</h2>
                  <p className="text-sm text-gray-500 mt-1">AI-powered suggestions based on your brand pillars, audience engagement, and content gaps</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-1">{rec.title}</h3>
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                                {rec.priority}
                              </span>
                              <span className="text-xs text-gray-500">{rec.type}</span>
                              <span className="text-xs text-gray-500">~{rec.estimatedTime}</span>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                        
                        <div className="mb-3">
                          <span className="text-xs font-medium text-gray-500 block mb-1">Content Pillar:</span>
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            {rec.pillar.replace('-', ' ')}
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          <span className="text-xs font-medium text-gray-500 block mb-1">AI Reasoning:</span>
                          <p className="text-xs text-gray-600 italic">{rec.reasoning}</p>
                        </div>
                        
                        <div className="mb-4">
                          <span className="text-xs font-medium text-gray-500 block mb-1">Suggested Keywords:</span>
                          <div className="flex flex-wrap gap-1">
                            {rec.suggestedKeywords.map((keyword) => (
                              <span key={keyword} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => createContentFromRecommendation(rec)}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Create Content
                          </button>
                          <button className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
                            Save for Later
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}