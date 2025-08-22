const { body, param, query, check } = require('express-validator');

// User validation schemas
const userValidators = {
  register: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
  ],

  login: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  updateRole: [
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID format'),
    body('role')
      .isIn(['VIEWER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'])
      .withMessage('Invalid role specified')
  ]
};

// Content validation schemas
const contentValidators = {
  create: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 200 })
      .withMessage('Title must be less than 200 characters'),
    body('type')
      .optional()
      .isIn(['SOCIAL_POST', 'EMAIL', 'BLOG_POST', 'VIDEO_SCRIPT', 'CAROUSEL', 'STORY', 'REEL', 'THREAD'])
      .withMessage('Invalid content type'),
    body('platform')
      .optional()
      .isIn(['INSTAGRAM', 'TWITTER', 'LINKEDIN', 'EMAIL', 'BLOG', 'YOUTUBE', 'TIKTOK'])
      .withMessage('Invalid platform'),
    body('status')
      .optional()
      .isIn(['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'])
      .withMessage('Invalid status'),
    body('scheduledDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format for scheduledDate'),
    body('content')
      .optional()
      .isLength({ max: 10000 })
      .withMessage('Content must be less than 10000 characters')
  ],

  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid content ID format'),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Title must be less than 200 characters'),
    body('type')
      .optional()
      .isIn(['SOCIAL_POST', 'EMAIL', 'BLOG_POST', 'VIDEO_SCRIPT', 'CAROUSEL', 'STORY', 'REEL', 'THREAD'])
      .withMessage('Invalid content type'),
    body('platform')
      .optional()
      .isIn(['INSTAGRAM', 'TWITTER', 'LINKEDIN', 'EMAIL', 'BLOG', 'YOUTUBE', 'TIKTOK'])
      .withMessage('Invalid platform'),
    body('status')
      .optional()
      .isIn(['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'])
      .withMessage('Invalid status')
  ],

  delete: [
    param('id')
      .isUUID()
      .withMessage('Invalid content ID format')
  ],

  publish: [
    param('id')
      .isUUID()
      .withMessage('Invalid content ID format'),
    body('platforms')
      .isArray({ min: 1 })
      .withMessage('At least one platform must be selected'),
    body('platforms.*')
      .isIn(['INSTAGRAM', 'TWITTER', 'LINKEDIN', 'FACEBOOK'])
      .withMessage('Invalid platform specified')
  ],

  schedule: [
    param('id')
      .isUUID()
      .withMessage('Invalid content ID format'),
    body('platforms')
      .isArray({ min: 1 })
      .withMessage('At least one platform must be selected'),
    body('scheduledTime')
      .isISO8601()
      .withMessage('Invalid scheduled time format')
      .custom((value) => {
        const scheduledDate = new Date(value);
        const now = new Date();
        if (scheduledDate <= now) {
          throw new Error('Scheduled time must be in the future');
        }
        return true;
      })
  ]
};

// Campaign validation schemas
const campaignValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Campaign name is required')
      .isLength({ max: 100 })
      .withMessage('Campaign name must be less than 100 characters'),
    body('startDate')
      .isISO8601()
      .withMessage('Invalid start date format'),
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((value, { req }) => {
        if (value && req.body.startDate) {
          const start = new Date(req.body.startDate);
          const end = new Date(value);
          if (end <= start) {
            throw new Error('End date must be after start date');
          }
        }
        return true;
      }),
    body('budget')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Budget must be a positive number'),
    body('goals')
      .optional()
      .isArray()
      .withMessage('Goals must be an array')
  ],

  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid campaign ID format'),
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Campaign name must be less than 100 characters'),
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format')
  ],

  addContent: [
    param('id')
      .isUUID()
      .withMessage('Invalid campaign ID format'),
    body('contentIds')
      .isArray({ min: 1 })
      .withMessage('Content IDs must be a non-empty array'),
    body('contentIds.*')
      .isUUID()
      .withMessage('Invalid content ID format')
  ]
};

// Workflow validation schemas
const workflowValidators = {
  createTemplate: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Workflow name is required')
      .isLength({ max: 100 })
      .withMessage('Workflow name must be less than 100 characters'),
    body('type')
      .optional()
      .isIn(['CONTENT_APPROVAL', 'TASK_SEQUENCE', 'CUSTOM'])
      .withMessage('Invalid workflow type'),
    body('stages')
      .optional()
      .isArray()
      .withMessage('Stages must be an array'),
    body('stages.*.name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Stage name is required'),
    body('stages.*.type')
      .optional()
      .isIn(['APPROVAL', 'TASK', 'NOTIFICATION', 'AUTO'])
      .withMessage('Invalid stage type')
  ],

  execute: [
    body('workflowId')
      .isUUID()
      .withMessage('Invalid workflow ID format'),
    body('contentId')
      .optional()
      .isUUID()
      .withMessage('Invalid content ID format')
  ],

  processAction: [
    param('instanceId')
      .isUUID()
      .withMessage('Invalid workflow instance ID format'),
    body('action')
      .isIn(['APPROVED', 'REJECTED', 'COMPLETED'])
      .withMessage('Invalid action'),
    body('comments')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Comments must be less than 1000 characters')
  ]
};

// Task validation schemas
const taskValidators = {
  create: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Task title is required')
      .isLength({ max: 200 })
      .withMessage('Task title must be less than 200 characters'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
      .withMessage('Invalid priority level'),
    body('type')
      .optional()
      .isIn(['CONTENT_CREATION', 'REVIEW', 'APPROVAL', 'CUSTOM', 'WORKFLOW_TASK'])
      .withMessage('Invalid task type'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid due date format'),
    body('assigneeId')
      .optional()
      .isUUID()
      .withMessage('Invalid assignee ID format')
  ],

  update: [
    param('taskId')
      .isUUID()
      .withMessage('Invalid task ID format'),
    body('status')
      .optional()
      .isIn(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'])
      .withMessage('Invalid task status'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
      .withMessage('Invalid priority level')
  ]
};

// Email/Newsletter validation schemas
const emailValidators = {
  subscribe: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be an object')
  ],

  sendCampaign: [
    param('id')
      .isUUID()
      .withMessage('Invalid campaign ID format'),
    body('testMode')
      .optional()
      .isBoolean()
      .withMessage('Test mode must be a boolean'),
    body('recipients')
      .optional()
      .isArray()
      .withMessage('Recipients must be an array')
  ]
};

// Pagination validation
const paginationValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'title', 'status', 'priority', 'dueDate'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Search validation
const searchValidators = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must be less than 100 characters')
    .escape(),
  query('status')
    .optional()
    .isIn(['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'])
    .withMessage('Invalid status filter'),
  query('platform')
    .optional()
    .isIn(['INSTAGRAM', 'TWITTER', 'LINKEDIN', 'EMAIL', 'BLOG', 'YOUTUBE', 'TIKTOK'])
    .withMessage('Invalid platform filter')
];

// File upload validation
const fileValidators = {
  upload: [
    check('file')
      .custom((value, { req }) => {
        if (!req.file) {
          throw new Error('No file uploaded');
        }
        
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/mpeg',
          'application/pdf',
          'text/csv'
        ];
        
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          throw new Error('Invalid file type');
        }
        
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (req.file.size > maxSize) {
          throw new Error('File size exceeds 10MB limit');
        }
        
        return true;
      })
  ]
};

// Date range validation
const dateRangeValidators = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (value && req.query.startDate) {
        const start = new Date(req.query.startDate);
        const end = new Date(value);
        if (end < start) {
          throw new Error('End date must be after or equal to start date');
        }
      }
      return true;
    })
];

module.exports = {
  userValidators,
  contentValidators,
  campaignValidators,
  workflowValidators,
  taskValidators,
  emailValidators,
  paginationValidators,
  searchValidators,
  fileValidators,
  dateRangeValidators
};