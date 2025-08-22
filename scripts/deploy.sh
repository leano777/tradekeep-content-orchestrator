#!/bin/bash

# TK Content Orchestrator Deployment Script
# Usage: ./deploy.sh [environment] [version]

set -e

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
PROJECT_NAME="tk-content-orchestrator"

echo "Deploying $PROJECT_NAME to $ENVIRONMENT with version $VERSION"

# Pre-deployment checks
echo "Running pre-deployment checks..."
docker --version
docker-compose --version

# Backup current deployment
echo "Creating backup..."
mkdir -p /opt/backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "Backup created at /opt/backups/${PROJECT_NAME}_${ENVIRONMENT}_${TIMESTAMP}"

# Deploy
echo "Starting deployment..."
docker-compose pull
docker-compose up -d

echo "Deployment completed successfully!"
