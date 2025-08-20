export interface User {
  id: string;
  email: string;
  name: string;
  role: 'VIEWER' | 'EDITOR' | 'ADMIN' | 'SUPER_ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface Content {
  id: string;
  title: string;
  content: string;
  type: 'POST' | 'ARTICLE' | 'STORY';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  scheduledAt?: string;
  platforms: string[];
  tags: string[];
  authorId: string;
  author?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  authorId: string;
  author?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploader?: User;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSubscriber {
  id: string;
  email: string;
  name?: string;
  status: 'ACTIVE' | 'UNSUBSCRIBED';
  tags?: string;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailCampaign {
  id: string;
  subject: string;
  content: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT';
  scheduledAt?: string;
  sentAt?: string;
  authorId: string;
  author?: User;
  recipients?: EmailCampaignRecipient[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailCampaignRecipient {
  id: string;
  campaignId: string;
  subscriberId: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAt?: string;
  subscriber?: EmailSubscriber;
}

export interface SocialMediaConnection {
  platform: string;
  connected: boolean;
  accountInfo?: {
    username?: string;
    displayName?: string;
    profileImage?: string;
  };
}

export interface AnalyticsData {
  period: string;
  metrics: {
    totalViews: number;
    totalEngagement: number;
    contentCount: number;
    conversionRate: number;
  };
  platformStats: Array<{
    platform: string;
    posts: number;
    engagement: number;
  }>;
  topContent: Array<{
    id: string;
    title: string;
    views: number;
    engagement: number;
    platform: string;
  }>;
}

export interface DashboardStats {
  totalContent: number;
  totalUsers: number;
  totalAssets: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user?: string;
  }>;
}