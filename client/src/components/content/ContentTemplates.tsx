'use client';

import { useState } from 'react';
import { 
  DocumentTextIcon,
  SparklesIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  PresentationChartLineIcon,
  HashtagIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface ContentTemplate {
  id: string;
  title: string;
  description: string;
  brandPillar: 'TRUST' | 'EXPERTISE' | 'INNOVATION' | 'COMMUNITY';
  contentType: 'BLOG_POST' | 'EMAIL' | 'SOCIAL_MEDIA' | 'DOCUMENTATION' | 'LANDING_PAGE';
  template: string;
  tags: string[];
  estimatedTime: number; // minutes
  targetAudience: string[];
  seoKeywords: string[];
}

interface ContentTemplatesProps {
  onSelectTemplate?: (template: ContentTemplate) => void;
  className?: string;
}

const BRAND_PILLAR_CONFIG = {
  TRUST: {
    label: 'Trust & Reliability',
    color: 'bg-blue-600',
    icon: ShieldCheckIcon,
    description: 'Build confidence through proven results and reliable service'
  },
  EXPERTISE: {
    label: 'Expert Knowledge',
    color: 'bg-green-600', 
    icon: ClipboardDocumentCheckIcon,
    description: 'Demonstrate industry knowledge and technical expertise'
  },
  INNOVATION: {
    label: 'Innovation & Growth',
    color: 'bg-purple-600',
    icon: LightBulbIcon,
    description: 'Showcase forward-thinking solutions and growth opportunities'
  },
  COMMUNITY: {
    label: 'Community Focus',
    color: 'bg-orange-600',
    icon: UserGroupIcon,
    description: 'Connect with local community and build relationships'
  }
};

const CONTENT_TEMPLATES: ContentTemplate[] = [
  // TRUST Pillar Templates
  {
    id: 'trust-case-study',
    title: 'Success Story Case Study',
    description: 'Showcase a completed project highlighting reliability and quality results',
    brandPillar: 'TRUST',
    contentType: 'BLOG_POST',
    template: `# Success Story: [Project Name]

## The Challenge
[Describe the initial problem or challenge the client faced]

## Our Approach
[Explain the methodology and planning process used]

## The Solution
[Detail the specific solutions implemented]

## Results & Impact
[Quantify the outcomes and benefits achieved]

## Client Testimonial
"[Include a direct quote from the satisfied client]"

## Why This Matters for Your Business
[Connect the success story to potential client needs]

**Ready to achieve similar results?** Contact TradeKeep today to discuss your project requirements.`,
    tags: ['case-study', 'success-story', 'testimonial', 'results'],
    estimatedTime: 45,
    targetAudience: ['potential-clients', 'property-managers', 'contractors'],
    seoKeywords: ['construction success story', 'reliable contractor', 'project results', 'client testimonial']
  },
  {
    id: 'trust-process',
    title: 'Quality Process Overview',
    description: 'Detail your quality control and project management processes',
    brandPillar: 'TRUST',
    contentType: 'DOCUMENTATION',
    template: `# Our Quality Assurance Process

## Phase 1: Initial Assessment
- [Detail assessment procedures]
- [Quality checkpoints]
- [Documentation requirements]

## Phase 2: Planning & Preparation
- [Planning methodology]
- [Material selection criteria]
- [Timeline development]

## Phase 3: Execution
- [Daily quality checks]
- [Progress monitoring]
- [Communication protocols]

## Phase 4: Final Inspection
- [Completion criteria]
- [Client walkthrough process]
- [Warranty information]

## Our Quality Guarantee
[Explain your quality guarantee and what it means for clients]`,
    tags: ['process', 'quality', 'documentation', 'standards'],
    estimatedTime: 60,
    targetAudience: ['potential-clients', 'quality-conscious-buyers'],
    seoKeywords: ['quality construction process', 'construction standards', 'project management', 'quality control']
  },

  // EXPERTISE Pillar Templates
  {
    id: 'expertise-guide',
    title: 'Technical How-To Guide',
    description: 'Educational content demonstrating industry expertise and knowledge',
    brandPillar: 'EXPERTISE',
    contentType: 'BLOG_POST',
    template: `# [Technical Topic]: A Complete Guide

## What You Need to Know
[Provide essential background information]

## Step-by-Step Process
### Step 1: [First Step]
[Detailed explanation with technical details]

### Step 2: [Second Step]
[Continue with professional insights]

### Step 3: [Third Step]
[Include best practices and common mistakes to avoid]

## Professional Tips
- [Expert tip 1]
- [Expert tip 2]
- [Expert tip 3]

## When to Call a Professional
[Explain when DIY isn't appropriate and professional help is needed]

## Common Mistakes to Avoid
[List frequent errors and how to prevent them]

**Need professional assistance?** TradeKeep's certified experts are here to help with your [topic] needs.`,
    tags: ['how-to', 'technical', 'education', 'expertise'],
    estimatedTime: 90,
    targetAudience: ['diy-enthusiasts', 'property-owners', 'maintenance-managers'],
    seoKeywords: ['how to guide', 'construction tips', 'professional advice', 'expert knowledge']
  },
  {
    id: 'expertise-market-analysis',
    title: 'Industry Market Analysis',
    description: 'Share market insights and industry trends demonstrating expertise',
    brandPillar: 'EXPERTISE',
    contentType: 'BLOG_POST',
    template: `# [Year] Construction Market Analysis: [Specific Area/Trend]

## Current Market Overview
[Provide data-driven market assessment]

## Key Trends We're Seeing
### Trend 1: [Trend Name]
[Analysis and implications]

### Trend 2: [Trend Name]
[Market data and predictions]

### Trend 3: [Trend Name]
[Professional insights]

## What This Means for Property Owners
[Connect market trends to client impact]

## Our Predictions for [Next Period]
[Professional forecasts based on experience]

## How TradeKeep Stays Ahead
[Explain how you adapt to market changes]

**Want to leverage these market insights for your project?** Contact our team for a strategic consultation.`,
    tags: ['market-analysis', 'trends', 'industry-insights', 'forecasting'],
    estimatedTime: 120,
    targetAudience: ['investors', 'property-developers', 'business-owners'],
    seoKeywords: ['construction market analysis', 'industry trends', 'market insights', 'construction forecast']
  },

  // INNOVATION Pillar Templates
  {
    id: 'innovation-technology',
    title: 'New Technology Showcase',
    description: 'Highlight innovative tools and technologies being used',
    brandPillar: 'INNOVATION',
    contentType: 'BLOG_POST',
    template: `# Revolutionizing Construction: [Technology Name]

## The Innovation
[Describe the new technology or method]

## How It Works
[Explain the technical aspects in accessible terms]

## Benefits for Our Clients
### Increased Efficiency
[Specific examples of time/cost savings]

### Enhanced Quality
[Quality improvements achieved]

### Future-Proofing
[Long-term advantages]

## Real-World Application
[Case study or example of technology in use]

## The Results
[Quantifiable outcomes and benefits]

## What's Next?
[Future innovations on the horizon]

**Ready to experience cutting-edge construction?** Let TradeKeep bring these innovations to your next project.`,
    tags: ['innovation', 'technology', 'efficiency', 'future'],
    estimatedTime: 75,
    targetAudience: ['tech-savvy-clients', 'early-adopters', 'commercial-clients'],
    seoKeywords: ['construction technology', 'innovative construction', 'construction innovation', 'modern building methods']
  },
  {
    id: 'innovation-sustainability',
    title: 'Sustainable Building Solutions',
    description: 'Focus on eco-friendly and sustainable construction practices',
    brandPillar: 'INNOVATION',
    contentType: 'BLOG_POST',
    template: `# Sustainable Construction: [Specific Solution/Method]

## The Environmental Challenge
[Define the sustainability issue being addressed]

## Our Innovative Approach
[Describe sustainable methods and materials used]

## Environmental Impact
### Resource Conservation
[Specific conservation measures]

### Energy Efficiency
[Energy-saving features and benefits]

### Waste Reduction
[Waste minimization strategies]

## Cost Benefits
[Long-term financial advantages of sustainable choices]

## Certifications & Standards
[Relevant green building certifications]

## Client Success Story
[Example of successful sustainable project]

## The Future of Green Construction
[Vision for sustainable building practices]

**Interested in sustainable construction solutions?** Contact TradeKeep to explore eco-friendly options for your project.`,
    tags: ['sustainability', 'green-building', 'eco-friendly', 'efficiency'],
    estimatedTime: 90,
    targetAudience: ['environmentally-conscious', 'cost-conscious', 'commercial-developers'],
    seoKeywords: ['sustainable construction', 'green building', 'eco-friendly construction', 'energy efficient']
  },

  // COMMUNITY Pillar Templates
  {
    id: 'community-spotlight',
    title: 'Local Community Spotlight',
    description: 'Highlight local businesses, partnerships, or community involvement',
    brandPillar: 'COMMUNITY',
    contentType: 'BLOG_POST',
    template: `# Community Spotlight: [Local Business/Organization Name]

## About [Subject]
[Introduction to the local business or organization]

## Our Partnership
[Explain the relationship and collaboration]

## Community Impact
[Describe how this partnership benefits the community]

## Shared Values
[Highlight common goals and values]

## Joint Initiatives
[Detail specific projects or initiatives together]

## Supporting Local Economy
[Explain the importance of local business support]

## What's Next?
[Future collaboration plans]

**TradeKeep is proud to support our local community.** Learn more about our community partnerships and how we give back.`,
    tags: ['community', 'local-business', 'partnership', 'support'],
    estimatedTime: 45,
    targetAudience: ['local-community', 'local-businesses', 'community-minded'],
    seoKeywords: ['local construction company', 'community partnership', 'local business support', 'community involvement']
  },
  {
    id: 'community-event',
    title: 'Community Event Coverage',
    description: 'Cover local events, sponsorships, or community participation',
    brandPillar: 'COMMUNITY',
    contentType: 'BLOG_POST',
    template: `# [Event Name]: TradeKeep in the Community

## About the Event
[Describe the community event]

## TradeKeep's Involvement
[Explain your participation/sponsorship]

## Event Highlights
[Key moments and activities from the event]

## Community Connection
[How the event strengthens community bonds]

## Photos & Memories
[Include event photos and memorable moments]

## Thank You to Participants
[Acknowledge community members and volunteers]

## Looking Forward
[Upcoming community events and involvement]

**Stay connected with TradeKeep's community activities.** Follow us for updates on local events and partnerships.`,
    tags: ['event', 'community', 'sponsorship', 'participation'],
    estimatedTime: 30,
    targetAudience: ['local-community', 'event-attendees', 'local-families'],
    seoKeywords: ['community event', 'local sponsorship', 'community involvement', 'local construction company']
  },

  // Email Templates
  {
    id: 'email-welcome',
    title: 'Welcome Email Series',
    description: 'Welcome new subscribers or clients to TradeKeep',
    brandPillar: 'TRUST',
    contentType: 'EMAIL',
    template: `Subject: Welcome to TradeKeep - Your Trusted Construction Partner

Hi [First Name],

Welcome to the TradeKeep family! We're excited to have you join our community of property owners who value quality, reliability, and exceptional service.

**What You Can Expect:**
• Expert construction insights and tips
• Project showcases and success stories
• Seasonal maintenance reminders
• Exclusive offers for subscribers

**Your Next Steps:**
1. Save our contact information: [Phone] | [Email]
2. Follow us on social media for daily tips
3. Reply to this email with any questions

**Need immediate assistance?** Don't hesitate to reach out. We're here to help with all your construction and maintenance needs.

Best regards,
The TradeKeep Team

P.S. Keep an eye out for our weekly newsletter featuring local projects and helpful tips!`,
    tags: ['welcome', 'email', 'onboarding', 'introduction'],
    estimatedTime: 20,
    targetAudience: ['new-subscribers', 'new-clients'],
    seoKeywords: ['construction services', 'welcome email', 'construction company']
  },

  // Social Media Templates
  {
    id: 'social-project-progress',
    title: 'Project Progress Update',
    description: 'Social media posts showcasing project progress and behind-the-scenes content',
    brandPillar: 'TRUST',
    contentType: 'SOCIAL_MEDIA',
    template: `📸 Project Progress Update! 🏗️

Day [X] of the [Project Type] at [Location]. 

✅ [Milestone achieved]
✅ [Second milestone]
🔄 Currently working on: [Current task]
📅 Next up: [Next phase]

Our team is making excellent progress while maintaining our high quality standards. 

#TradeKeep #ConstructionProgress #QualityWork #[Location]City #BuildingExcellence

---

Caption variations:
- "Another successful milestone reached! 💪"
- "Quality construction takes time, but the results are worth it! ⭐"
- "Behind the scenes with the TradeKeep team 👷‍♂️"`,
    tags: ['social-media', 'progress', 'behind-the-scenes', 'project-update'],
    estimatedTime: 10,
    targetAudience: ['social-followers', 'potential-clients', 'community'],
    seoKeywords: ['construction progress', 'building project', 'construction company', 'quality construction']
  }
];

export function ContentTemplates({ onSelectTemplate, className }: ContentTemplatesProps) {
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const filteredTemplates = CONTENT_TEMPLATES.filter(template => {
    if (selectedPillar && template.brandPillar !== selectedPillar) return false;
    if (selectedType && template.contentType !== selectedType) return false;
    return true;
  });

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'BLOG_POST': return DocumentTextIcon;
      case 'EMAIL': return EnvelopeIcon;
      case 'SOCIAL_MEDIA': return HashtagIcon;
      case 'DOCUMENTATION': return ClipboardDocumentCheckIcon;
      case 'LANDING_PAGE': return PresentationChartLineIcon;
      default: return DocumentTextIcon;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Content Templates</h2>
        <p className="text-tk-gray-400">
          Pre-built templates aligned with TradeKeep's brand pillars to accelerate content creation.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-4">
            {/* Brand Pillar Filter */}
            <div>
              <label className="block text-sm font-medium text-tk-gray-300 mb-2">Brand Pillar</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedPillar(null)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    !selectedPillar 
                      ? 'bg-tk-blue-600 text-white border-tk-blue-600' 
                      : 'text-tk-gray-400 border-tk-gray-600 hover:border-tk-gray-500'
                  }`}
                >
                  All Pillars
                </button>
                {Object.entries(BRAND_PILLAR_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPillar(selectedPillar === key ? null : key)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      selectedPillar === key 
                        ? `${config.color} text-white border-transparent` 
                        : 'text-tk-gray-400 border-tk-gray-600 hover:border-tk-gray-500'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Type Filter */}
            <div>
              <label className="block text-sm font-medium text-tk-gray-300 mb-2">Content Type</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedType(null)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    !selectedType 
                      ? 'bg-tk-blue-600 text-white border-tk-blue-600' 
                      : 'text-tk-gray-400 border-tk-gray-600 hover:border-tk-gray-500'
                  }`}
                >
                  All Types
                </button>
                {['BLOG_POST', 'EMAIL', 'SOCIAL_MEDIA', 'DOCUMENTATION', 'LANDING_PAGE'].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(selectedType === type ? null : type)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      selectedType === type 
                        ? 'bg-tk-blue-600 text-white border-tk-blue-600' 
                        : 'text-tk-gray-400 border-tk-gray-600 hover:border-tk-gray-500'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => {
          const pillarConfig = BRAND_PILLAR_CONFIG[template.brandPillar];
          const ContentTypeIcon = getContentTypeIcon(template.contentType);
          const PillarIcon = pillarConfig.icon;

          return (
            <Card key={template.id} className="hover:border-tk-blue-500 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <ContentTypeIcon className="w-5 h-5 text-tk-gray-400" />
                    <h3 className="font-semibold text-white">{template.title}</h3>
                  </div>
                  <div className={`p-2 rounded-lg ${pillarConfig.color}`}>
                    <PillarIcon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-sm text-tk-gray-400 mt-2">{template.description}</p>
              </CardHeader>
              
              <CardBody>
                <div className="space-y-4">
                  {/* Template Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-tk-gray-400">Time:</span>
                      <span className="text-white ml-1">{template.estimatedTime}m</span>
                    </div>
                    <div>
                      <span className="text-tk-gray-400">Tags:</span>
                      <span className="text-white ml-1">{template.tags.length}</span>
                    </div>
                  </div>

                  {/* Brand Pillar Badge */}
                  <Badge className={pillarConfig.color}>
                    {pillarConfig.label}
                  </Badge>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} className="bg-tk-gray-700 text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge className="bg-tk-gray-700 text-xs">
                        +{template.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Use Template Button */}
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => onSelectTemplate?.(template)}
                  >
                    <SparklesIcon className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <DocumentTextIcon className="w-12 h-12 text-tk-gray-600 mx-auto mb-4" />
              <p className="text-tk-gray-400">No templates match your current filters.</p>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedPillar(null);
                  setSelectedType(null);
                }}
                className="mt-2"
              >
                Clear Filters
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}