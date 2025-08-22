# TK Content Orchestrator API Documentation

## Base URL
```
Development: http://localhost:9002/api/v1
Production: https://api.tradekeep.com/v1
```

## Authentication
All API requests require authentication using JWT tokens.

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

## Endpoints

### Authentication

#### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "EDITOR"
  }
}
```

#### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "EDITOR"
  }
}
```

#### Get Current User
```http
GET /auth/me
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "EDITOR"
  }
}
```

### Content Management

#### List Content
```http
GET /content?status=draft&type=post&page=1&limit=10
```

**Query Parameters:**
- `status` (optional): draft, published, scheduled, archived
- `type` (optional): post, article, newsletter, social
- `pillar` (optional): Content pillar ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "content": [
    {
      "id": "content-id",
      "title": "Content Title",
      "body": "Content body",
      "type": "post",
      "status": "draft",
      "authorId": "user-id",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

#### Get Content by ID
```http
GET /content/:id
```

**Response:**
```json
{
  "id": "content-id",
  "title": "Content Title",
  "body": "Content body",
  "type": "post",
  "status": "draft",
  "authorId": "user-id",
  "author": {
    "id": "user-id",
    "name": "John Doe",
    "email": "user@example.com"
  },
  "assets": [],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### Create Content
```http
POST /content
```

**Request Body:**
```json
{
  "title": "New Content",
  "body": "Content body",
  "type": "post",
  "status": "draft",
  "pillar": "educational"
}
```

**Response:**
```json
{
  "id": "content-id",
  "title": "New Content",
  "body": "Content body",
  "type": "post",
  "status": "draft",
  "authorId": "user-id",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Update Content
```http
PUT /content/:id
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "body": "Updated body",
  "status": "published"
}
```

**Response:**
```json
{
  "id": "content-id",
  "title": "Updated Title",
  "body": "Updated body",
  "status": "published",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### Delete Content
```http
DELETE /content/:id
```

**Response:**
```json
{
  "message": "Content deleted successfully"
}
```

### Workflow Management

#### Create Workflow Template
```http
POST /workflows/templates
```

**Request Body:**
```json
{
  "name": "Content Approval",
  "description": "Standard content approval workflow",
  "type": "CONTENT_APPROVAL",
  "stages": [
    {
      "name": "Review",
      "type": "REVIEW",
      "order": 1,
      "assigneeRole": "MANAGER"
    },
    {
      "name": "Approval",
      "type": "APPROVAL",
      "order": 2,
      "assigneeRole": "ADMIN"
    }
  ]
}
```

#### Start Workflow Instance
```http
POST /workflows/instances
```

**Request Body:**
```json
{
  "workflowId": "workflow-id",
  "contentId": "content-id",
  "metadata": {
    "priority": "high",
    "deadline": "2024-01-15"
  }
}
```

#### Process Workflow Stage
```http
POST /workflows/instances/:instanceId/process
```

**Request Body:**
```json
{
  "action": "APPROVED",
  "comments": "Looks good, approved for publishing"
}
```

### Analytics

#### Dashboard Analytics
```http
GET /analytics/dashboard
```

**Response:**
```json
{
  "overview": {
    "totalContent": 150,
    "publishedContent": 120,
    "draftContent": 25,
    "scheduledContent": 5
  },
  "engagement": {
    "totalViews": 10000,
    "totalLikes": 500,
    "totalShares": 200,
    "totalComments": 150
  },
  "topContent": [
    {
      "id": "content-id",
      "title": "Popular Post",
      "views": 1000,
      "engagement": 150
    }
  ],
  "recentActivity": [
    {
      "type": "content_published",
      "contentId": "content-id",
      "userId": "user-id",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Content Performance
```http
GET /analytics/content-performance?period=30d
```

**Query Parameters:**
- `period`: 7d, 30d, 90d, 1y

**Response:**
```json
{
  "performance": [
    {
      "date": "2024-01-01",
      "views": 500,
      "engagement": 50,
      "shares": 20
    }
  ],
  "topPerformers": [
    {
      "contentId": "content-id",
      "title": "Top Post",
      "metrics": {
        "views": 1000,
        "engagement": 100
      }
    }
  ]
}
```

### Task Management

#### Create Task
```http
POST /tasks
```

**Request Body:**
```json
{
  "title": "Review blog post",
  "description": "Review and approve the latest blog post",
  "type": "REVIEW",
  "priority": "HIGH",
  "assigneeId": "user-id",
  "dueDate": "2024-01-15T00:00:00Z",
  "contentId": "content-id"
}
```

#### List Tasks
```http
GET /tasks?status=TODO&assigneeId=user-id
```

**Query Parameters:**
- `status`: TODO, IN_PROGRESS, BLOCKED, COMPLETED
- `assigneeId`: User ID
- `priority`: LOW, MEDIUM, HIGH, URGENT
- `type`: CONTENT_CREATION, REVIEW, APPROVAL, CUSTOM

#### Update Task
```http
PUT /tasks/:id
```

**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "progress": 50
}
```

### Publishing

#### Schedule Publishing
```http
POST /publishing/schedule
```

**Request Body:**
```json
{
  "contentId": "content-id",
  "platforms": ["twitter", "linkedin", "facebook"],
  "scheduledAt": "2024-01-15T10:00:00Z",
  "options": {
    "autoRepost": true,
    "reposterInterval": "4h"
  }
}
```

#### Publish Now
```http
POST /publishing/publish-now
```

**Request Body:**
```json
{
  "contentId": "content-id",
  "platforms": ["twitter", "linkedin"]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

- General API: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- Content creation: 60 requests per minute
- File uploads: 10 uploads per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

## Pagination

All list endpoints support pagination:
```
GET /endpoint?page=2&limit=20
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Webhooks

Configure webhooks to receive real-time notifications:

### Events
- `content.created`
- `content.published`
- `content.deleted`
- `workflow.completed`
- `task.assigned`
- `task.completed`

### Webhook Payload
```json
{
  "event": "content.published",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "contentId": "content-id",
    "title": "Published Content",
    "platforms": ["twitter", "linkedin"]
  }
}
```

## SDK Examples

### JavaScript
```javascript
import { TKContentAPI } from '@tradekeep/content-api';

const api = new TKContentAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.tradekeep.com/v1'
});

// Create content
const content = await api.content.create({
  title: 'New Post',
  body: 'Post content',
  type: 'post'
});

// Publish content
await api.publishing.publishNow(content.id, ['twitter', 'linkedin']);
```

### Python
```python
from tk_content_api import TKContentAPI

api = TKContentAPI(
    api_key='your-api-key',
    base_url='https://api.tradekeep.com/v1'
)

# Create content
content = api.content.create(
    title='New Post',
    body='Post content',
    type='post'
)

# Publish content
api.publishing.publish_now(
    content_id=content['id'],
    platforms=['twitter', 'linkedin']
)
```

## Support

For API support and questions:
- Email: api-support@tradekeep.com
- Documentation: https://docs.tradekeep.com/api
- Status Page: https://status.tradekeep.com