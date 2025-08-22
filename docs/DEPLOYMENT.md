# TradeKeep Content Orchestrator - Deployment Guide

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Environment Configuration](#environment-configuration)
- [SSL Configuration](#ssl-configuration)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Server**: 2+ CPU cores, 4GB+ RAM, 20GB+ storage
- **OS**: Ubuntu 20.04+ or similar Linux distribution
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Node.js**: Version 20+ (for local development)
- **PostgreSQL**: Version 15+ (if not using Docker)

### Domain & SSL
- Domain name pointed to your server
- SSL certificate (or use Let's Encrypt)

## Deployment Options

### 1. Docker Deployment (Recommended)

The easiest way to deploy TradeKeep CMS is using Docker and Docker Compose.

#### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/your-username/tradekeep-content-orchestrator.git
cd tradekeep-content-orchestrator
```

2. **Configure environment**
```bash
cp .env.production.example .env.production
# Edit .env.production with your values
nano .env.production
```

3. **Run deployment script**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh .env.production docker-compose.production.yml --seed
```

#### Manual Docker Deployment

```bash
# Build images
docker-compose -f docker-compose.production.yml build

# Start services
docker-compose -f docker-compose.production.yml up -d

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Check logs
docker-compose logs -f
```

### 2. Cloud Deployment

#### Vercel (Frontend) + Railway/Render (Backend)

##### Frontend on Vercel

1. Fork the repository
2. Connect to Vercel
3. Configure environment variables:
   - `NEXT_PUBLIC_API_URL`: Your backend URL

##### Backend on Railway

1. Create new project on Railway
2. Connect GitHub repository
3. Configure environment variables (see [Environment Configuration](#environment-configuration))
4. Deploy with these settings:
   - Build Command: `cd server && npm ci && npx prisma generate`
   - Start Command: `cd server && npx prisma migrate deploy && npm start`

##### Backend on Render

1. Create new Web Service on Render
2. Connect GitHub repository
3. Configure:
   - Build Command: `cd server && npm ci && npx prisma generate`
   - Start Command: `cd server && npx prisma migrate deploy && npm start`
   - Add PostgreSQL database
   - Set environment variables

#### AWS Deployment

##### Using EC2

1. **Launch EC2 instance**
   - Ubuntu 20.04 LTS
   - t3.medium or larger
   - Security groups: 80, 443, 22, 3000, 9002

2. **Install dependencies**
```bash
sudo apt update
sudo apt install -y docker.io docker-compose nginx certbot
sudo systemctl start docker
sudo usermod -aG docker $USER
```

3. **Deploy application**
```bash
git clone https://github.com/your-username/tradekeep-content-orchestrator.git
cd tradekeep-content-orchestrator
./scripts/deploy.sh
```

##### Using ECS

1. Build and push images to ECR
2. Create ECS task definitions
3. Configure Application Load Balancer
4. Set up ECS services

#### Google Cloud Platform

##### Using Cloud Run

1. **Build and push images**
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/tradekeep-backend ./server
gcloud builds submit --tag gcr.io/PROJECT_ID/tradekeep-frontend ./client
```

2. **Deploy services**
```bash
gcloud run deploy tradekeep-backend --image gcr.io/PROJECT_ID/tradekeep-backend
gcloud run deploy tradekeep-frontend --image gcr.io/PROJECT_ID/tradekeep-frontend
```

## Environment Configuration

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/tradekeep
JWT_SECRET=your-very-secure-secret-key

# Application URLs
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

### Optional Variables

```env
# Social Media APIs
TWITTER_API_KEY=xxx
LINKEDIN_ACCESS_TOKEN=xxx
INSTAGRAM_ACCESS_TOKEN=xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## SSL Configuration

### Using Let's Encrypt

1. **Install Certbot**
```bash
sudo apt install certbot python3-certbot-nginx
```

2. **Generate certificate**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

3. **Auto-renewal**
```bash
sudo certbot renew --dry-run
```

### Using Custom SSL Certificate

1. Place certificates in `nginx/ssl/`
2. Update `nginx/nginx.conf` with certificate paths
3. Restart Nginx container

## Database Management

### Backup

```bash
# Manual backup
docker exec tradekeep-db pg_dump -U postgres tradekeep > backup.sql

# Automated backup (cron job)
0 2 * * * docker exec tradekeep-db pg_dump -U postgres tradekeep > /backups/backup_$(date +\%Y\%m\%d).sql
```

### Restore

```bash
docker exec -i tradekeep-db psql -U postgres tradekeep < backup.sql
```

### Migrations

```bash
# Create migration
docker-compose exec backend npx prisma migrate dev --name migration_name

# Apply migrations
docker-compose exec backend npx prisma migrate deploy
```

## Monitoring

### Health Checks

- Backend: `https://api.yourdomain.com/health`
- Frontend: `https://yourdomain.com`

### Logging

```bash
# View all logs
docker-compose logs

# View specific service
docker-compose logs backend -f

# Export logs
docker-compose logs > logs.txt
```

### Metrics

Consider integrating:
- **Sentry**: Error tracking
- **New Relic**: Performance monitoring
- **Datadog**: Infrastructure monitoring
- **Google Analytics**: User analytics

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.production.yml
backend:
  deploy:
    replicas: 3
```

### Load Balancing

Use Nginx or cloud load balancers to distribute traffic.

### Caching

1. **Redis** (included in docker-compose)
2. **CloudFlare** for CDN
3. **Nginx** caching for static assets

## Security

### Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, unique passwords
   - Rotate secrets regularly

2. **Network Security**
   - Use firewall (ufw, iptables)
   - Limit exposed ports
   - Use VPN for admin access

3. **Updates**
   - Keep dependencies updated
   - Regular security patches
   - Monitor CVE advisories

### Security Headers

Already configured in Nginx:
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Strict-Transport-Security

## Troubleshooting

### Common Issues

#### Container won't start
```bash
docker-compose logs backend
docker-compose down
docker-compose up -d
```

#### Database connection issues
```bash
# Check database is running
docker ps | grep postgres

# Test connection
docker exec -it tradekeep-db psql -U postgres
```

#### Permission issues
```bash
# Fix file permissions
sudo chown -R 1001:1001 ./server/uploads
```

#### Port conflicts
```bash
# Check ports
netstat -tulpn | grep -E '3000|9002|5432'

# Kill process
kill -9 <PID>
```

### Logs Location

- Nginx: `nginx/logs/`
- Application: `docker-compose logs`
- Database: `docker exec tradekeep-db tail -f /var/log/postgresql/postgresql.log`

## Support

For issues and questions:
- GitHub Issues: [github.com/your-username/tradekeep-content-orchestrator/issues](https://github.com/your-username/tradekeep-content-orchestrator/issues)
- Documentation: [github.com/your-username/tradekeep-content-orchestrator/wiki](https://github.com/your-username/tradekeep-content-orchestrator/wiki)

## License

This project is licensed under the MIT License.