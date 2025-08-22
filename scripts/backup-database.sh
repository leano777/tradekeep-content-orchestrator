#!/bin/bash

# Database Backup Script for TK Content Orchestrator
# Runs automated backups with retention policy

set -e

# Configuration
BACKUP_DIR="/opt/backups/database"
DB_PATH="/opt/tk-content-orchestrator/server/prisma/dev.db"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="tk_database_${TIMESTAMP}.db"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "[$(date)] Starting database backup..."

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database file not found at $DB_PATH"
    exit 1
fi

# Create backup with SQLite backup command
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/$BACKUP_NAME'"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_NAME"
BACKUP_FILE="${BACKUP_NAME}.gz"

# Calculate checksum
CHECKSUM=$(sha256sum "$BACKUP_DIR/$BACKUP_FILE" | awk '{print $1}')
echo "$CHECKSUM" > "$BACKUP_DIR/${BACKUP_NAME}.sha256"

# Create backup metadata
cat > "$BACKUP_DIR/${BACKUP_NAME}.meta" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "filename": "$BACKUP_FILE",
    "size": $(stat -c%s "$BACKUP_DIR/$BACKUP_FILE"),
    "checksum": "$CHECKSUM",
    "retention_days": $RETENTION_DAYS
}
EOF

# Clean up old backups
echo "[$(date)] Cleaning up old backups..."
find "$BACKUP_DIR" -name "*.db.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.sha256" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.meta" -mtime +$RETENTION_DAYS -delete

# Upload to cloud storage (if configured)
if [ ! -z "$AWS_S3_BUCKET" ]; then
    echo "[$(date)] Uploading to S3..."
    aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$AWS_S3_BUCKET/database-backups/$BACKUP_FILE"
    aws s3 cp "$BACKUP_DIR/${BACKUP_NAME}.sha256" "s3://$AWS_S3_BUCKET/database-backups/${BACKUP_NAME}.sha256"
fi

# Verify backup
echo "[$(date)] Verifying backup..."
if sqlite3 "$BACKUP_DIR/$BACKUP_NAME" "PRAGMA integrity_check;" 2>/dev/null; then
    echo "[$(date)] Backup verified successfully"
else
    echo "[$(date)] Warning: Backup verification failed"
fi

# Log backup completion
echo "[$(date)] Database backup completed: $BACKUP_FILE"

# Send notification if configured
if [ ! -z "$SLACK_WEBHOOK" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"Database backup completed successfully: ${BACKUP_FILE} (${CHECKSUM})\"}" \
        "$SLACK_WEBHOOK" 2>/dev/null
fi