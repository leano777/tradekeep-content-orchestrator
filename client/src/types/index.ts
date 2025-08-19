// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'EDITOR' | 'VIEWER';
  avatar?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

export interface RegisterData {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
}

// Content Types
export interface ContentItem {
  id: string;
  title: string;
  content?: string;
  description?: string;
  type: ContentType;
  platform: Platform;
  status: ContentStatus;
  brandPillar?: BrandPillar;
  contentFormat: ContentFormat;
  scheduledAt?: string;
  publishedAt?: string;
  expiresAt?: string;
  priority: Priority;
  tags: string[];
  metadata?: Record<string, any>;
  aiGenerated: boolean;
  parentId?: string;
  version: number;
  authorId: string;
  assignedToId?: string;
  author: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  assignedTo?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  assets?: ContentAsset[];
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentAsset {
  id: string;
  contentId: string;
  assetId: string;
  role: AssetRole;
  order: number;
  asset: Asset;
}

export interface Asset {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  description?: string;
  tags: string[];
  category: AssetCategory;
  uploadedById: string;
  uploadedBy: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  contentId: string;
  authorId: string;
  parentId?: string;
  text: string;
  isResolved: boolean;
  author: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

// Campaign Types
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  goal?: string;
  targetMetrics?: Record<string, any>;
  settings?: Record<string, any>;
  createdById: string;
  createdBy: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  content?: CampaignContent[];
  emailSequence?: EmailSequence;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignContent {
  id: string;
  campaignId: string;
  contentId: string;
  order: number;
  scheduled: boolean;
  campaign: Campaign;
  content: ContentItem;
}

export interface EmailSequence {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  trigger: EmailTrigger;
  settings?: Record<string, any>;
  emails?: Email[];
  createdAt: string;
  updatedAt: string;
}

export interface Email {
  id: string;
  sequenceId: string;
  subject: string;
  preheader?: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
  delayDays: number;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Analytics Types
export interface AnalyticsData {
  id: string;
  contentId: string;
  platform: Platform;
  metric: string;
  value: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface DashboardMetrics {
  totalContent: number;
  publishedContent: number;
  draftContent: number;
  scheduledContent: number;
  contentByPlatform: Array<{
    platform: Platform;
    _count: { platform: number };
  }>;
  contentByStatus: Array<{
    status: ContentStatus;
    _count: { status: number };
  }>;
}

// Enum Types
export type ContentType = 
  | 'SOCIAL_POST'
  | 'EMAIL' 
  | 'BLOG_POST'
  | 'VIDEO_SCRIPT'
  | 'CAROUSEL'
  | 'STORY'
  | 'REEL'
  | 'THREAD';

export type Platform =
  | 'INSTAGRAM'
  | 'TWITTER'
  | 'LINKEDIN'
  | 'EMAIL'
  | 'BLOG'
  | 'YOUTUBE'
  | 'TIKTOK';

export type ContentStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'REJECTED';

export type BrandPillar =
  | 'INTERNAL_OPERATING_SYSTEM'
  | 'PSYCHOLOGY_OVER_STRATEGY'
  | 'DISCIPLINE_OVER_DOPAMINE'
  | 'SYSTEMS_VS_REACTIVE_TRADING';

export type ContentFormat =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'CAROUSEL'
  | 'STORY'
  | 'REEL'
  | 'THREAD'
  | 'EMAIL_TEMPLATE'
  | 'BLOG_ARTICLE';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type AssetCategory = 
  | 'IMAGE'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'TEMPLATE'
  | 'LOGO'
  | 'ICON'
  | 'FONT'
  | 'OTHER';

export type AssetRole = 
  | 'PRIMARY'
  | 'SECONDARY'
  | 'BACKGROUND'
  | 'THUMBNAIL'
  | 'ATTACHMENT';

export type CampaignType =
  | 'PRODUCT_LAUNCH'
  | 'AWARENESS'
  | 'ENGAGEMENT'
  | 'CONVERSION'
  | 'RETENTION'
  | 'EMAIL_SEQUENCE';

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export type EmailTrigger = 'SIGNUP' | 'PURCHASE' | 'ABANDON_CART' | 'BIRTHDAY' | 'ANNIVERSARY' | 'CUSTOM';

// API Response Types
export interface ApiResponse<T> {
  status: 'success' | 'fail' | 'error';
  data?: T;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginatedResponse<T> {
  status: 'success';
  results: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  data: T;
}

// Calendar Types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  contentItem: ContentItem;
  color?: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

// Theme Types
export interface ThemeContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}