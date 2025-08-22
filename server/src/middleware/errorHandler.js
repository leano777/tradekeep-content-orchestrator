const winston = require('winston');
const { validationResult } = require('express-validator');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

// Enhanced AppError class with error codes
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.errorCode = errorCode || this.getDefaultErrorCode(statusCode);
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  getDefaultErrorCode(statusCode) {
    const errorCodes = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT'
    };
    return errorCodes[statusCode] || 'UNKNOWN_ERROR';
  }
}

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, req, res) => {
  const response = {
    status: err.status,
    error: err.message,
    errorCode: err.errorCode,
    stack: err.stack,
    details: err,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR 💥', err);
  }

  return res.status(err.statusCode).json(response);
};

const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err.message,
      errorCode: err.errorCode,
      timestamp: new Date().toISOString()
    });
  }

  // Programming or other unknown error: don't leak error details
  logger.error('ERROR 💥', err);
  
  return res.status(500).json({
    status: 'error',
    error: 'Something went wrong',
    errorCode: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle Prisma errors
    if (error.code && error.code.startsWith('P')) {
      error = handlePrismaError(error);
    }
    
    // Handle other database errors
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    return res.status(400).json({
      status: 'fail',
      error: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      details: errorMessages,
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Database error handler for Prisma
const handlePrismaError = (error) => {
  switch (error.code) {
    case 'P2002':
      return new AppError(
        `Duplicate value for unique field: ${error.meta?.target}`,
        409,
        'DUPLICATE_ENTRY'
      );
    case 'P2025':
      return new AppError(
        'Record not found',
        404,
        'RECORD_NOT_FOUND'
      );
    case 'P2003':
      return new AppError(
        'Foreign key constraint failed',
        400,
        'FOREIGN_KEY_CONSTRAINT'
      );
    case 'P2014':
      return new AppError(
        'Required relation data is missing',
        400,
        'MISSING_RELATION'
      );
    default:
      return new AppError(
        'Database operation failed',
        500,
        'DATABASE_ERROR'
      );
  }
};

// Standardized success response helper
const sendSuccess = (res, data, statusCode = 200, meta = {}) => {
  const response = {
    status: 'success',
    data,
    timestamp: new Date().toISOString()
  };

  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  res.status(statusCode).json(response);
};

// Standardized error response helper
const sendError = (res, message, statusCode = 500, errorCode = null, details = null) => {
  const response = {
    status: statusCode >= 500 ? 'error' : 'fail',
    error: message,
    errorCode: errorCode || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.details = details;
  }

  res.status(statusCode).json(response);
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    }
    
    if (res.statusCode >= 500) {
      logger.error({
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    }
  });
  
  next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      if (typeof obj === 'string') {
        return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sanitize(item));
    }

    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitize(obj[key]);
      }
    }
    return sanitized;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};

// Not found handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    status: 'fail',
    error: `Route ${req.originalUrl} not found on this server`,
    errorCode: 'ROUTE_NOT_FOUND',
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  handleValidationErrors,
  handlePrismaError,
  sendSuccess,
  sendError,
  requestLogger,
  sanitizeInput,
  notFoundHandler,
  logger
};