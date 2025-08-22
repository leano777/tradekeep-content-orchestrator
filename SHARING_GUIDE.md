# How to Share TK Content Orchestrator with Another Developer

## Option 1: Using GitHub (Recommended)
Your project is already connected to GitHub at: https://github.com/leano777/tradekeep-content-orchestrator.git

### Steps to share:
1. **Commit and push your changes:**
   ```bash
   # Add all changes
   git add .
   
   # Commit with a descriptive message
   git commit -m "feat: add authentication and workflow features"
   
   # Push to GitHub
   git push origin master
   ```

2. **Add collaborator on GitHub:**
   - Go to https://github.com/leano777/tradekeep-content-orchestrator
   - Click Settings → Manage access → Invite a collaborator
   - Enter their GitHub username or email

3. **Share with the developer:**
   - Send them the repository URL
   - They can clone it with:
   ```bash
   git clone https://github.com/leano777/tradekeep-content-orchestrator.git
   ```

## Option 2: Create a ZIP Archive (Quick Share)
```bash
# Create archive excluding large/unnecessary folders
tar -czf tk-content-orchestrator.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=dist \
  --exclude=.git \
  --exclude=uploads \
  --exclude=*.log \
  .
```

## Option 3: Fork for Public Collaboration
1. Make the repository public on GitHub (if comfortable)
2. Developer can fork the repository
3. They can submit pull requests for changes

## Setup Instructions for New Developer

### Prerequisites
- Node.js 18+ and npm
- Git
- SQLite (comes with Prisma)

### Installation Steps
```bash
# 1. Clone the repository
git clone https://github.com/leano777/tradekeep-content-orchestrator.git
cd tradekeep-content-orchestrator

# 2. Install root dependencies
npm install

# 3. Setup backend
cd server
npm install
npx prisma generate
npx prisma migrate dev
npm run seed  # Optional: seed database with sample data

# 4. Setup frontend
cd ../client
npm install

# 5. Create environment variables
# Create .env files in both /server and /client directories
```

### Required Environment Variables

#### Server (.env)
```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# Authentication
JWT_SECRET="your-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"

# Server Config
PORT=3001
NODE_ENV=development

# Email Service (Optional)
RESEND_API_KEY="your-resend-api-key"

# Cloud Storage (Optional)
GOOGLE_DRIVE_CLIENT_ID="your-client-id"
GOOGLE_DRIVE_CLIENT_SECRET="your-client-secret"

# Social Media APIs (Optional)
TWITTER_API_KEY="your-twitter-key"
INSTAGRAM_CLIENT_ID="your-instagram-id"
LINKEDIN_CLIENT_ID="your-linkedin-id"
```

#### Client (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### Running the Application

#### Development Mode
```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

#### Production Mode
```bash
# Using Docker Compose
docker-compose up

# Or manually
cd server && npm start
cd client && npm run build && npm start
```

### Project Structure
```
tk-content-orchestrator/
├── client/              # Next.js frontend
│   ├── src/
│   │   ├── app/        # App routes
│   │   ├── components/ # React components
│   │   ├── hooks/      # Custom hooks
│   │   └── utils/      # Utilities
├── server/              # Node.js backend
│   ├── prisma/         # Database schema
│   ├── src/
│   │   ├── routes/     # API endpoints
│   │   ├── middleware/ # Express middleware
│   │   └── services/   # Business logic
├── docs/               # Documentation
└── scripts/            # Deployment scripts
```

### Key Features
- Content Management System
- Real-time Collaboration
- Workflow Automation
- Asset Management with Cloud Storage
- Analytics Dashboard
- Brand Guidelines Management
- Authentication & Authorization

### Troubleshooting
1. **Database issues:** Run `npx prisma migrate reset` in server folder
2. **Port conflicts:** Change ports in .env files
3. **Missing dependencies:** Delete node_modules and package-lock.json, then reinstall

### Contact
Repository: https://github.com/leano777/tradekeep-content-orchestrator
Issues: https://github.com/leano777/tradekeep-content-orchestrator/issues