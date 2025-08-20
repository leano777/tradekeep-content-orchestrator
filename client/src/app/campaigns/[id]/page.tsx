'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { 
  ArrowLeft, Calendar, Clock, Users, Target, 
  Plus, Edit, Trash2
} from 'lucide-react';
import { Campaign, Content } from '@/types';

interface CampaignWithContent extends Campaign {
  content: Array<{
    id: string;
    order: number;
    content: {
      id: string;
      title: string;
      status: string;
      type: string;
      createdAt: string;
    };
  }>;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id as string;
  
  const [campaign, setCampaign] = useState<CampaignWithContent | null>(null);
  const [availableContent, setAvailableContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddContent, setShowAddContent] = useState(false);
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);

  useEffect(() => {
    if (campaignId) {
      fetchCampaignDetail();
      fetchAvailableContent();
    }
  }, [campaignId]);

  const fetchCampaignDetail = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'}/api/v1/campaigns/${campaignId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch campaign');
      }

      const data = await response.json();
      setCampaign(data.data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableContent = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'}/api/v1/content`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableContent(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    }
  };

  const addContentToCampaign = async () => {
    if (selectedContentIds.length === 0) return;

    try {
      const currentContentIds = campaign?.content?.map(c => c.content.id) || [];
      const allContentIds = [...currentContentIds, ...selectedContentIds];

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'}/api/v1/campaigns/${campaignId}/content`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ contentIds: allContentIds })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add content');
      }

      await fetchCampaignDetail();
      setShowAddContent(false);
      setSelectedContentIds([]);
    } catch (error) {
      console.error('Error adding content:', error);
      alert('Failed to add content to campaign');
    }
  };

  const removeContentFromCampaign = async (contentId: string) => {
    try {
      const currentContentIds = campaign?.content?.map(c => c.content.id) || [];
      const updatedContentIds = currentContentIds.filter(id => id !== contentId);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'}/api/v1/campaigns/${campaignId}/content`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ contentIds: updatedContentIds })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove content');
      }

      await fetchCampaignDetail();
    } catch (error) {
      console.error('Error removing content:', error);
      alert('Failed to remove content from campaign');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Campaign not found</p>
          <Button onClick={() => router.push('/campaigns')} className="mt-4">
            Back to Campaigns
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const availableContentForSelection = availableContent.filter(
    content => !campaign.content?.some(c => c.content.id === content.id)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/campaigns')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              {campaign.description && (
                <p className="text-gray-600 mt-1">{campaign.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>
              {campaign.status}
            </span>
            <Button variant="secondary">
              <Edit size={16} />
            </Button>
          </div>
        </div>

        {/* Campaign Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(campaign.startDate)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">End Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {campaign.endDate ? formatDate(campaign.endDate) : 'No end date'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Content Items</p>
                <p className="text-lg font-semibold text-gray-900">
                  {campaign.content?.length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Campaign Content</h3>
            <Button
              onClick={() => setShowAddContent(true)}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Add Content
            </Button>
          </div>

          {!campaign.content || campaign.content.length === 0 ? (
            <div className="p-6 text-center">
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No content added</h3>
              <p className="text-gray-500 mb-4">
                Add content pieces to organize your campaign strategy.
              </p>
              <Button onClick={() => setShowAddContent(true)}>
                Add Your First Content
              </Button>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {campaign.content.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {item.content.title}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {item.content.type}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.content.status)}`}>
                            {item.content.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => removeContentFromCampaign(item.content.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Add Content Modal */}
        {showAddContent && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Content to Campaign</h3>
              
              {availableContentForSelection.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No available content to add</p>
                </div>
              ) : (
                <div className="space-y-2 mb-6">
                  {availableContentForSelection.map((content) => (
                    <label
                      key={content.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedContentIds.includes(content.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContentIds([...selectedContentIds, content.id]);
                          } else {
                            setSelectedContentIds(selectedContentIds.filter(id => id !== content.id));
                          }
                        }}
                        className="mr-3"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{content.title}</div>
                        <div className="text-xs text-gray-500">{content.type} • {content.status}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddContent(false);
                    setSelectedContentIds([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={addContentToCampaign}
                  disabled={selectedContentIds.length === 0}
                >
                  Add Selected ({selectedContentIds.length})
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}