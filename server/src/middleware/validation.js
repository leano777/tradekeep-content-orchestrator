const validator = require('validator');

// Email validation
const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!validator.isEmail(email)) {
    return { isValid: false, error: 'Please provide a valid email address' };
  }
  
  return { isValid: true };
};

// Password validation
const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters' };
  }
  
  // Check for at least one letter and one number
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one letter and one number' };
  }
  
  return { isValid: true };
};

// Name validation
const validateName = (name) => {
  if (!name) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (name.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }
  
  if (name.length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { isValid: true };
};

// Content validation
const validateContent = (title, body) => {
  const errors = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
  } else if (title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }
  
  if (!body || body.trim().length === 0) {
    errors.push('Content body is required');
  } else if (body.length > 10000) {
    errors.push('Content body must be less than 10,000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Middleware for user registration validation
const validateRegistration = (req, res, next) => {
  const { email, password, name } = req.body;
  const errors = [];
  
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.push(emailValidation.error);
  }
  
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.push(passwordValidation.error);
  }
  
  const nameValidation = validateName(name);
  if (!nameValidation.isValid) {
    errors.push(nameValidation.error);
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors
    });
  }
  
  next();
};

// Middleware for login validation
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];
  
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.push(emailValidation.error);
  }
  
  if (!password) {
    errors.push('Password is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors
    });
  }
  
  next();
};

// Middleware for content validation
const validateContentData = (req, res, next) => {
  const { title, body } = req.body;
  
  const validation = validateContent(title, body);
  if (!validation.isValid) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: validation.errors
    });
  }
  
  next();
};

// Rate limiting helper
const createRateLimiter = (windowMs, max, message) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key);
    const windowStart = now - windowMs;
    
    // Remove old requests
    const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);
    requests.set(key, recentRequests);
    
    if (recentRequests.length >= max) {
      return res.status(429).json({ 
        error: 'Too many requests',
        message: message || 'Please try again later'
      });
    }
    
    recentRequests.push(now);
    next();
  };
};

// Specific rate limiters
const loginRateLimit = createRateLimiter(15 * 60 * 1000, 5, 'Too many login attempts, please try again in 15 minutes');
const passwordResetRateLimit = createRateLimiter(60 * 60 * 1000, 3, 'Too many password reset requests, please try again in 1 hour');

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  validateContent,
  validateRegistration,
  validateLogin,
  validateContentData,
  createRateLimiter,
  loginRateLimit,
  passwordResetRateLimit
};