#!/bin/bash

# TradeKeep CMS Deployment Script
# This script handles the deployment of the TradeKeep Content Orchestrator

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=${1:-.env.production}
COMPOSE_FILE=${2:-docker-compose.production.yml}

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found"
        log_info "Please copy .env.production.example to $ENV_FILE and configure it"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Build images
build_images() {
    log_info "Building Docker images..."
    docker-compose -f $COMPOSE_FILE build --no-cache
    log_info "Images built successfully"
}

# Database backup (if updating existing deployment)
backup_database() {
    if docker ps --format '{{.Names}}' | grep -q 'tradekeep-db'; then
        log_info "Backing up existing database..."
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        docker exec tradekeep-db pg_dump -U postgres tradekeep > backups/$BACKUP_FILE
        log_info "Database backed up to backups/$BACKUP_FILE"
    fi
}

# Deploy application
deploy() {
    log_info "Starting deployment..."
    
    # Load environment variables
    export $(cat $ENV_FILE | grep -v '^#' | xargs)
    
    # Stop existing containers (if any)
    log_info "Stopping existing containers..."
    docker-compose -f $COMPOSE_FILE down
    
    # Start new containers
    log_info "Starting new containers..."
    docker-compose -f $COMPOSE_FILE up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # Run database migrations
    log_info "Running database migrations..."
    docker-compose -f $COMPOSE_FILE exec -T backend npx prisma migrate deploy
    
    # Seed database (only on first deployment)
    if [ "$3" == "--seed" ]; then
        log_info "Seeding database..."
        docker-compose -f $COMPOSE_FILE exec -T backend npx prisma db seed
    fi
    
    log_info "Deployment completed successfully!"
}

# Health check
health_check() {
    log_info "Running health checks..."
    
    # Check backend
    if curl -f http://localhost:9002/health > /dev/null 2>&1; then
        log_info "Backend is healthy"
    else
        log_error "Backend health check failed"
        exit 1
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log_info "Frontend is healthy"
    else
        log_error "Frontend health check failed"
        exit 1
    fi
    
    log_info "All services are healthy"
}

# Main execution
main() {
    echo "========================================="
    echo "TradeKeep CMS Deployment Script"
    echo "========================================="
    
    check_prerequisites
    
    # Create necessary directories
    mkdir -p backups
    mkdir -p nginx/ssl
    mkdir -p nginx/logs
    mkdir -p server/uploads
    
    # Backup existing database
    backup_database
    
    # Build and deploy
    build_images
    deploy "$@"
    
    # Wait a bit for services to stabilize
    sleep 15
    
    # Run health checks
    health_check
    
    echo "========================================="
    log_info "Deployment completed successfully!"
    log_info "Frontend: http://localhost:3000"
    log_info "Backend: http://localhost:9002"
    log_info "Database: localhost:5432"
    echo "========================================="
}

# Run main function
main "$@"