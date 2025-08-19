const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const winston = require('winston');
const expressWinston = require('express-winston');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const campaignRoutes = require('./routes/campaigns');
const assetRoutes = require('./routes/assets');
const cloudAssetRoutes = require('./routes/cloudAssets');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');

const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 8000;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tradekeep-cms' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.resend.com"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(compression());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
  ignoreRoute: function (req, res) { return false; }
}));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/v1/status', (req, res) => {
  res.json({
    message: 'TradeKeep Content Management System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: {
      contentGeneration: process.env.ENABLE_AI_GENERATION === 'true',
      emailCampaigns: process.env.ENABLE_EMAIL_CAMPAIGNS === 'true',
      socialPublishing: process.env.ENABLE_SOCIAL_PUBLISHING === 'true',
      analytics: process.env.ENABLE_ANALYTICS === 'true',
      collaboration: process.env.ENABLE_COLLABORATION === 'true'
    }
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/content', authMiddleware, contentRoutes);
app.use('/api/v1/campaigns', authMiddleware, campaignRoutes);
app.use('/api/v1/assets', authMiddleware, assetRoutes);
app.use('/api/v1/cloud-assets', authMiddleware, cloudAssetRoutes);
app.use('/api/v1/analytics', authMiddleware, analyticsRoutes);
app.use('/api/v1/users', authMiddleware, userRoutes);

app.use(expressWinston.errorLogger({
  winstonInstance: logger
}));

app.use(errorHandler);

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist.',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🚀 TradeKeep CMS Server running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    logger.info(`📡 API Status: http://localhost:${PORT}/api/v1/status`);
    
    if (process.env.ENABLE_AI_GENERATION === 'true') {
      logger.info('🤖 AI Content Generation: Enabled');
    }
    if (process.env.ENABLE_EMAIL_CAMPAIGNS === 'true') {
      logger.info('📧 Email Campaigns: Enabled');
    }
    if (process.env.ENABLE_SOCIAL_PUBLISHING === 'true') {
      logger.info('📱 Social Publishing: Enabled');
    }
  });
}

module.exports = app;