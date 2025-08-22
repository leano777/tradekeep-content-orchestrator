const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Content Security Policy configuration
const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
};

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? contentSecurityPolicy : false,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'API rate limit exceeded, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: 'Upload rate limit exceeded, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Data sanitization middleware
const dataSanitization = [
  mongoSanitize(), // Prevent NoSQL injection attacks
  xss(), // Clean user input from malicious HTML
  hpp() // Prevent HTTP Parameter Pollution
];

// Request size limiting
const requestSizeLimit = express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook signature verification if needed
    req.rawBody = buf.toString('utf8');
  }
});

// Security audit logging
const securityAuditLog = (req, res, next) => {
  // Log security-relevant events
  if (req.path.includes('/auth/') || req.method === 'DELETE') {
    console.log({
      timestamp: new Date().toISOString(),
      event: 'security_audit',
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    });
  }
  next();
};

// Input validation helper
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove any potential script tags
  input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  input = input.replace(/on\w+\s*=\s*"[^"]*"/gi, '');
  input = input.replace(/on\w+\s*=\s*'[^']*'/gi, '');
  input = input.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  input = input.replace(/javascript:/gi, '');
  
  return input;
};

// SQL injection prevention helper
const preventSQLInjection = (req, res, next) => {
  // Sanitize common SQL injection patterns in query params
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
    /(--|#|\/\*|\*\/)/g,
    /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s*\d+\s*=\s*\d+)/gi
  ];
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          return false;
        }
      }
    }
    return true;
  };
  
  // Check query parameters
  for (const [key, value] of Object.entries(req.query || {})) {
    if (!checkValue(value)) {
      return res.status(400).json({ error: 'Invalid input detected' });
    }
  }
  
  // Check body parameters
  for (const [key, value] of Object.entries(req.body || {})) {
    if (!checkValue(value)) {
      return res.status(400).json({ error: 'Invalid input detected' });
    }
  }
  
  next();
};

module.exports = {
  securityHeaders,
  generalLimiter,
  authLimiter,
  apiLimiter,
  uploadLimiter,
  dataSanitization,
  requestSizeLimit,
  securityAuditLog,
  sanitizeInput,
  preventSQLInjection,
  contentSecurityPolicy
};