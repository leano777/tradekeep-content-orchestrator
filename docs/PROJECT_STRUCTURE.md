# Project Structure Documentation

## Overview
This document provides a comprehensive overview of the TK Content Orchestrator project structure, explaining the purpose and contents of each directory and key files.

## Directory Structure

```
TK-CONTENT-ORCHESTRATOR/
├── client/                     # Frontend Next.js application
├── server/                     # Backend Node.js/Express API
├── docs/                       # Documentation
├── tools/                      # Development and testing tools
├── scripts/                    # Automation and deployment scripts
├── docker-compose.yml          # Docker orchestration
├── README.md                   # Project overview
└── package.json               # Root package configuration
```

## Detailed Directory Breakdown

### `/client` - Frontend Application
The Next.js 14 application with TypeScript and Tailwind CSS.

```
client/
├── src/
│   ├── app/                   # App Router pages and layouts
│   │   ├── (auth)/            # Authentication pages
│   │   ├── dashboard/         # Main dashboard
│   │   ├── content/           # Content management
│   │   ├── analytics/         # Analytics views
│   │   ├── workflows/         # Workflow automation
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable React components
│   │   ├── ui/               # Base UI components
│   │   ├── content/          # Content-specific components
│   │   ├── collaboration/    # Real-time collaboration
│   │   └── layout/           # Layout components
│   ├── hooks/                # Custom React hooks
│   │   └── useAuth.tsx       # Authentication hook
│   ├── lib/                  # Utility functions and API clients
│   │   ├── api.ts           # API client
│   │   └── socket.ts        # WebSocket client
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
├── .env.example            # Environment variables template
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

#### Key Frontend Features:
- **App Router**: Modern Next.js 14 routing system
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first CSS framework
- **Real-time Updates**: Socket.io integration for live collaboration

### `/server` - Backend API
Express.js server with Prisma ORM and SQLite database.

```
server/
├── src/
│   ├── routes/              # API route handlers
│   │   ├── auth.js         # Authentication endpoints
│   │   ├── content.js      # Content CRUD operations
│   │   ├── analytics.js    # Analytics data endpoints
│   │   ├── workflows.js    # Workflow automation
│   │   └── assets.js       # Asset management
│   ├── middleware/         # Express middleware
│   │   ├── auth.js        # JWT authentication
│   │   ├── validation.js  # Request validation
│   │   ├── errorHandler.js # Error handling
│   │   └── rateLimiter.js # Rate limiting
│   ├── services/          # Business logic and integrations
│   │   ├── auth/         # Authentication services
│   │   ├── email/        # Email service (Resend)
│   │   ├── storage/      # File storage (local/cloud)
│   │   └── socialMedia/  # Social media integrations
│   ├── websocket/        # Real-time communication
│   │   └── socketServer.js # Socket.io server
│   └── server-minimal.js # Simplified server entry
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── seed.js         # Database seeding
│   └── migrations/     # Database migrations
├── uploads/           # File upload directory
├── .env.example      # Environment variables template
└── package.json     # Dependencies and scripts
```

#### Key Backend Features:
- **RESTful API**: Well-structured endpoints
- **Prisma ORM**: Type-safe database access
- **JWT Auth**: Secure authentication with refresh tokens
- **WebSocket**: Real-time communication support
- **File Uploads**: Local and cloud storage integration

### `/docs` - Documentation
Comprehensive project documentation.

```
docs/
├── API.md                    # API endpoint documentation
├── DEPLOYMENT.md            # Deployment instructions
├── CONTRIBUTING.md          # Contribution guidelines
├── SHARING_GUIDE.md        # Developer onboarding
├── PROJECT_STRUCTURE.md    # This file
├── SECURITY.md             # Security documentation
└── archive-conversations/  # Historical development notes
```

### `/tools` - Development Tools
Development utilities and testing tools.

```
tools/
├── testing/               # Test files and utilities
│   ├── test-app.html     # Frontend testing
│   ├── test-api.html     # API testing
│   └── test-*.html       # Various test files
└── session-tracker/      # Development session tracking
    ├── dashboard.html    # Session dashboard
    └── session-manager.js # Session management
```

### `/scripts` - Automation Scripts
Deployment and maintenance scripts.

```
scripts/
├── deploy.sh             # Production deployment
└── backup-database.sh    # Database backup utility
```

## Configuration Files

### Root Configuration
- **`package.json`**: Root package dependencies and scripts
- **`docker-compose.yml`**: Docker container orchestration
- **`docker-compose.production.yml`**: Production Docker config
- **`.gitignore`**: Git ignore patterns
- **`.env.example`**: Environment variables template

### Client Configuration
- **`next.config.js`**: Next.js configuration
- **`tailwind.config.js`**: Tailwind CSS customization
- **`tsconfig.json`**: TypeScript compiler options
- **`postcss.config.js`**: PostCSS configuration

### Server Configuration
- **`prisma/schema.prisma`**: Database schema definition
- **`.env.example`**: Server environment template

## Database Structure

### Core Models
- **User**: User accounts and authentication
- **Content**: Content items and drafts
- **Campaign**: Marketing campaigns
- **Asset**: Media and file assets
- **Workflow**: Automation workflows
- **Analytics**: Performance metrics

### Supporting Models
- **Comment**: Content comments
- **Activity**: User activity tracking
- **Notification**: User notifications
- **Permission**: Role-based permissions

## API Endpoints Overview

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout

### Content Management
- `GET /api/content` - List content
- `POST /api/content` - Create content
- `PUT /api/content/:id` - Update content
- `DELETE /api/content/:id` - Delete content

### Real-time Features
- WebSocket connection at `/socket.io`
- Events: `content:update`, `user:presence`, `comment:new`

## Development Workflow

### Getting Started
1. Clone repository
2. Install dependencies (`npm install` in root, client, server)
3. Configure environment variables
4. Initialize database (`npx prisma migrate dev`)
5. Start development servers

### Development Commands
```bash
# Backend development
cd server && npm run dev

# Frontend development
cd client && npm run dev

# Run both concurrently
npm run dev:all
```

### Testing
```bash
# Run backend tests
cd server && npm test

# Run frontend tests
cd client && npm test

# E2E testing
npm run test:e2e
```

## Production Deployment

### Docker Deployment
```bash
docker-compose -f docker-compose.production.yml up -d
```

### Manual Deployment
1. Build frontend: `cd client && npm run build`
2. Build backend: `cd server && npm run build`
3. Set production environment variables
4. Start services with PM2 or systemd

## Best Practices

### Code Organization
- Keep components small and focused
- Use TypeScript for type safety
- Follow REST conventions for APIs
- Implement proper error handling

### Security
- Use environment variables for secrets
- Implement rate limiting
- Validate all inputs
- Use HTTPS in production

### Performance
- Implement caching strategies
- Optimize database queries
- Use CDN for static assets
- Enable compression

## Troubleshooting

### Common Issues
1. **Port conflicts**: Change ports in .env files
2. **Database errors**: Run `npx prisma migrate reset`
3. **Build failures**: Clear cache and rebuild
4. **Dependencies**: Delete node_modules and reinstall

### Debug Mode
Enable debug logging:
```bash
DEBUG=* npm run dev
```

## Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## Support
- GitHub Issues: Report bugs and request features
- Documentation: Check `/docs` folder
- Community: Join discussions on GitHub

---

Last Updated: January 2025
Version: 1.0.0