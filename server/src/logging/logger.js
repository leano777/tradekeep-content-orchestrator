const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray'
};

winston.addColors(colors);

// Format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.printf(
    info => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [];

// Console transport (always active in development)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat
    })
  );
}

// File transport for errors
transports.push(
  new DailyRotateFile({
    filename: path.join(__dirname, '../../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '30d',
    format
  })
);

// File transport for all logs
transports.push(
  new DailyRotateFile({
    filename: path.join(__dirname, '../../../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format
  })
);

// File transport for HTTP logs
transports.push(
  new DailyRotateFile({
    filename: path.join(__dirname, '../../../logs/http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    maxSize: '20m',
    maxFiles: '7d',
    format
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false
});

// Create specialized loggers
const httpLogger = winston.createLogger({
  level: 'http',
  format,
  transports: [
    new DailyRotateFile({
      filename: path.join(__dirname, '../../../logs/access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d'
    })
  ]
});

const securityLogger = winston.createLogger({
  level: 'info',
  format,
  transports: [
    new DailyRotateFile({
      filename: path.join(__dirname, '../../../logs/security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d'
    })
  ]
});

const performanceLogger = winston.createLogger({
  level: 'info',
  format,
  transports: [
    new DailyRotateFile({
      filename: path.join(__dirname, '../../../logs/performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

// Morgan stream for HTTP logging
const morganStream = {
  write: (message) => {
    httpLogger.http(message.trim());
  }
};

// Express middleware for request logging
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      requestId: req.id
    };
    
    if (res.statusCode >= 400) {
      logger.error('Request failed', logData);
    } else if (duration > 1000) {
      performanceLogger.warn('Slow request', logData);
    } else {
      httpLogger.http('Request completed', logData);
    }
  });
  
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  const errorData = {
    message: err.message,
    stack: err.stack,
    status: err.status || 500,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    requestId: req.id
  };
  
  logger.error('Application error', errorData);
  
  // Log security-related errors
  if (err.status === 401 || err.status === 403) {
    securityLogger.warn('Security error', errorData);
  }
  
  next(err);
};

// Audit logging for sensitive operations
const auditLog = (action, userId, details) => {
  securityLogger.info('Audit log', {
    action,
    userId,
    details,
    timestamp: new Date().toISOString(),
    ip: details.ip,
    userAgent: details.userAgent
  });
};

// Performance logging
const logPerformance = (operation, duration, metadata = {}) => {
  const logData = {
    operation,
    duration: `${duration}ms`,
    ...metadata
  };
  
  if (duration > 5000) {
    performanceLogger.error('Critical performance issue', logData);
  } else if (duration > 2000) {
    performanceLogger.warn('Performance warning', logData);
  } else {
    performanceLogger.info('Performance metric', logData);
  }
};

// Database query logging
const logDatabaseQuery = (query, duration, params) => {
  if (process.env.LOG_DATABASE_QUERIES === 'true') {
    const logData = {
      query,
      duration: `${duration}ms`,
      params: process.env.NODE_ENV === 'development' ? params : undefined
    };
    
    if (duration > 1000) {
      performanceLogger.warn('Slow database query', logData);
    } else {
      logger.debug('Database query', logData);
    }
  }
};

// Structured logging helpers
const logInfo = (message, metadata = {}) => {
  logger.info(message, metadata);
};

const logWarn = (message, metadata = {}) => {
  logger.warn(message, metadata);
};

const logError = (message, error, metadata = {}) => {
  logger.error(message, {
    error: error.message,
    stack: error.stack,
    ...metadata
  });
};

const logDebug = (message, metadata = {}) => {
  logger.debug(message, metadata);
};

// Export logging utilities
module.exports = {
  logger,
  httpLogger,
  securityLogger,
  performanceLogger,
  morganStream,
  requestLogger,
  errorLogger,
  auditLog,
  logPerformance,
  logDatabaseQuery,
  logInfo,
  logWarn,
  logError,
  logDebug
};