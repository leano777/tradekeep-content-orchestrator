# 🚀 TradeKeep Content Orchestrator

> A comprehensive content management system designed specifically for TradeKeep's brand strategy and content creation workflow.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748.svg)](https://www.prisma.io/)

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#️-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Brand Integration](#-brand-integration)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Overview

The TradeKeep Content Orchestrator is a purpose-built content management system that transforms TradeKeep's content strategy from reactive to proactive. It ensures consistent brand messaging while scaling content production efficiently across all platforms.

### 🎨 Built for TradeKeep's Brand Strategy

This system is deeply integrated with TradeKeep's **four core messaging pillars**:

1. **🧠 Internal Operating System** - "Fix the system, not the symptom"
2. **🔬 Psychology Over Strategy** - "Mental game trumps technical knowledge"  
3. **⚡ Discipline Over Dopamine** - "Choose consistency over emotional highs"
4. **🎯 Systems vs Reactive Trading** - "Follow proven systems, not emotions"

## ✨ Features

### 📅 Content Calendar & Scheduling Board
- **Visual calendar interface** with drag-drop functionality
- **Multi-platform scheduling** (Instagram, Twitter/X, LinkedIn, Email)
- **Content status tracking** (Draft → Review → Approved → Scheduled → Published)
- **Batch content planning** - Generate 30-day campaigns
- **Real-time collaboration** with team members

### 🤖 Brand-Guided Content Generation
- **AI-powered content creation** using TradeKeep's messaging pillars
- **Voice consistency checker** against brand guidelines
- **Template library** based on proven content patterns
- **Content format optimization** (Quote cards, carousels, trader thoughts, mantras)
- **Brand pillar mapping** for every piece of content

### 📧 Email Campaign Builder
- **Resend API integration** for reliable email delivery
- **Drag-drop sequence builder** based on proven 14-email campaigns
- **A/B testing capabilities** with performance analytics
- **Template library** from successful campaigns
- **Automated nurture sequences** with psychology-first approach

### 🗂️ Asset Management System
- **Integration with existing content library** (22,000+ indexed files)
- **Brand compliance checker** for visual assets
- **Asset versioning** and approval workflows
- **Smart categorization** (branding, visual, marketing, technical)
- **Metadata management** and search functionality

### 📊 Analytics & Performance Tracking
- **Real-time content performance** across all platforms
- **Email campaign metrics** (open rates, click-through rates, conversions)
- **Brand voice compliance scoring** using AI analysis
- **Team productivity metrics** and collaboration insights
- **ROI tracking** for content campaigns

### 📚 Documentation & Knowledge Base
- **Living documentation** that updates with the platform
- **Change log management** with automated and manual entries
- **Brand guidelines reference** always accessible
- **Content strategy documentation** and best practices
- **User guides** and platform tutorials

## 🏗️ Architecture

### **Frontend Stack**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling with TradeKeep brand system
- **Framer Motion** - Smooth animations and interactions
- **React Query** - Data fetching and state management
- **Zustand** - Global state management

### **Backend Stack**
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **Prisma** - Type-safe database toolkit
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage
- **JWT** - Authentication and authorization

### **Integrations**
- **Resend API** - Email delivery and tracking
- **OpenAI/Claude** - AI content generation
- **Social Media APIs** - Instagram, Twitter/X, LinkedIn
- **Content Indexer** - Integration with existing 22K+ file library

### **Infrastructure**
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **Vercel/Railway** - Deployment platform
- **PostgreSQL** - Database hosting

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0.0 or higher
- **PostgreSQL** 14.0 or higher
- **npm** 8.0.0 or higher

### 1. Clone the Repository

```bash
git clone https://github.com/tradekeep/content-orchestrator.git
cd content-orchestrator
```

### 2. Install Dependencies

```bash
npm run install:all
```

This command installs dependencies for both the client and server.

### 3. Environment Setup

```bash
cp .env.example .env
```

Configure the following essential variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/tradekeep_cms

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Email Service (Resend)
RESEND_API_KEY=re_your_resend_api_key_here

# AI Content Generation
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 4. Database Setup

```bash
cd server
npx prisma migrate dev
npm run db:seed
```

### 5. Start Development Servers

```bash
npm run dev
```

This starts both the frontend and backend development servers:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000

## 📁 Project Structure

```
tradekeep-content-orchestrator/
├── 📁 client/                     # Next.js Frontend
│   ├── 📁 src/
│   │   ├── 📁 app/               # Next.js App Router pages
│   │   ├── 📁 components/        # Reusable UI components
│   │   │   ├── 📁 ui/           # Base UI components
│   │   │   ├── 📁 forms/        # Form components
│   │   │   ├── 📁 layout/       # Layout components
│   │   │   ├── 📁 dashboard/    # Dashboard-specific components
│   │   │   └── 📁 calendar/     # Calendar components
│   │   ├── 📁 hooks/            # Custom React hooks
│   │   ├── 📁 utils/            # Client-side utilities
│   │   ├── 📁 store/            # Global state management
│   │   ├── 📁 types/            # TypeScript type definitions
│   │   └── 📁 styles/           # CSS and styling
│   └── 📄 package.json
├── 📁 server/                     # Node.js Backend
│   ├── 📁 src/
│   │   ├── 📁 controllers/      # Route handlers
│   │   ├── 📁 models/           # Database models
│   │   ├── 📁 middleware/       # Custom middleware
│   │   ├── 📁 services/         # Business logic
│   │   ├── 📁 routes/           # API routes
│   │   ├── 📁 utils/            # Server utilities
│   │   └── 📄 index.js          # Server entry point
│   ├── 📁 prisma/               # Database schema and migrations
│   └── 📄 package.json
├── 📁 shared/                     # Shared types and utilities
├── 📁 docs/                      # Documentation
├── 📄 README.md                   # This file
├── 📄 package.json               # Root package.json
└── 📄 .env.example               # Environment variables template
```

## 🎨 Brand Integration

### Core Messaging Pillars

Every piece of content in the system is mapped to one of TradeKeep's four messaging pillars:

#### 1. 🧠 Internal Operating System
- **Color**: Blue (`#3B82F6`)
- **Message**: "Your results are outputs of your internal system"
- **Focus**: Technical but accessible, systematic thinking

#### 2. 🔬 Psychology Over Strategy  
- **Color**: Purple (`#8B5CF6`)
- **Message**: "Mental game trumps technical knowledge"
- **Focus**: Insightful, empathetic but firm, psychologically aware

#### 3. ⚡ Discipline Over Dopamine
- **Color**: Red (`#EF4444`)
- **Message**: "Choose consistency over emotional highs"
- **Focus**: Motivational but realistic, long-term benefits

#### 4. 🎯 Systems vs Reactive Trading
- **Color**: Green (`#10B981`)
- **Message**: "Follow proven systems, not emotions"
- **Focus**: Authoritative, contrasting, professional standards

### Brand Voice Guidelines

#### ✅ DO:
- Challenge common trading assumptions
- Focus on internal mastery over external prediction
- Use contrarian insights to reveal truth
- Emphasize psychology over technical analysis
- Treat trading as character development
- Apply stoic wisdom to trading challenges

#### ❌ DON'T:
- Use hype or get-rich-quick language
- Focus on technical analysis or chart patterns
- Make market predictions or give trade signals
- Promise guaranteed results or easy money
- Be preachy or condescending
- Focus on being right rather than consistent

## 📡 API Documentation

### Authentication Endpoints

```http
POST /api/v1/auth/register     # User registration
POST /api/v1/auth/login        # User login
POST /api/v1/auth/logout       # User logout
GET  /api/v1/auth/me           # Get current user
PATCH /api/v1/auth/me          # Update user profile
```

### Content Management

```http
GET    /api/v1/content         # List all content
POST   /api/v1/content         # Create new content
GET    /api/v1/content/:id     # Get single content item
PATCH  /api/v1/content/:id     # Update content item
DELETE /api/v1/content/:id     # Delete content item
```

### Campaign Management

```http
GET    /api/v1/campaigns       # List all campaigns
POST   /api/v1/campaigns       # Create new campaign
GET    /api/v1/campaigns/:id   # Get single campaign
PATCH  /api/v1/campaigns/:id   # Update campaign
DELETE /api/v1/campaigns/:id   # Delete campaign
```

### Asset Management

```http
GET    /api/v1/assets          # List all assets
POST   /api/v1/assets/upload   # Upload new asset
GET    /api/v1/assets/:id      # Get single asset
PATCH  /api/v1/assets/:id      # Update asset metadata
DELETE /api/v1/assets/:id      # Delete asset
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev                    # Start both client and server
npm run client:dev            # Start only frontend
npm run server:dev            # Start only backend

# Building
npm run build                 # Build for production
npm run start                 # Start production server

# Database
npm run db:migrate            # Run database migrations
npm run db:seed               # Seed database with sample data
npm run db:reset              # Reset database

# Testing
npm run test                  # Run tests
npm run test:watch           # Run tests in watch mode
npm run test:coverage        # Run tests with coverage

# Code Quality
npm run lint                 # Run ESLint
npm run lint:fix            # Fix ESLint errors
npm run type-check          # Run TypeScript type checking
```

### Database Schema

The system uses Prisma with PostgreSQL and includes:

- **User Management** - Roles, permissions, preferences
- **Content Items** - Versioning, workflow states, brand pillars
- **Campaigns** - Multi-content campaigns with scheduling
- **Email Sequences** - Automated email campaigns
- **Assets** - File management with metadata
- **Analytics** - Performance tracking and insights
- **Activity Logs** - Audit trail for all actions
- **Brand Guidelines** - Centralized brand rule storage

### Environment Variables

See `.env.example` for all available environment variables. Key categories:

- **Database Configuration** - Connection and credentials
- **Authentication** - JWT secrets and session configuration
- **External APIs** - Resend, OpenAI, social media platforms
- **File Storage** - Upload paths and limits
- **Feature Flags** - Enable/disable specific features

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style

- **ESLint** configuration for code consistency
- **Prettier** for automatic code formatting
- **TypeScript** for type safety
- **Conventional Commits** for clear commit messages

## 📊 Roadmap

### Phase 1: Foundation ✅
- [x] Project structure and configuration
- [x] Database schema and models
- [x] Authentication and user management
- [x] Basic CRUD operations

### Phase 2: Core Features 🚧
- [ ] Content calendar and scheduling board
- [ ] Brand-guided content generation
- [ ] Email campaign builder
- [ ] Asset management system

### Phase 3: Advanced Features 📋
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard
- [ ] AI-powered brand compliance
- [ ] Social media publishing
- [ ] Performance optimization

### Phase 4: Scale & Polish 📋
- [ ] Mobile responsiveness
- [ ] Advanced reporting
- [ ] Third-party integrations
- [ ] Enterprise features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **TradeKeep Team** - For the vision and brand strategy
- **Open Source Community** - For the amazing tools and frameworks
- **Contributors** - For making this project better

---

<div align="center">
  <strong>Built with ❤️ for TradeKeep</strong>
  <br>
  <em>Transforming trading through disciplined content strategy</em>
</div>