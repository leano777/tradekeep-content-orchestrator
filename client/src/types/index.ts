export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Content {
  id: string;
  title: string;
  body: string;
  type: 'post' | 'email' | 'social';
  status: 'draft' | 'review' | 'approved' | 'scheduled' | 'published';
  pillar: 'internal-os' | 'psychology' | 'discipline' | 'systems';
  platform?: 'instagram' | 'twitter' | 'linkedin' | 'email';
  scheduledAt?: Date;
  publishedAt?: Date;
  author: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  content: Content[];
  status: 'planning' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document';
  url: string;
  size: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}