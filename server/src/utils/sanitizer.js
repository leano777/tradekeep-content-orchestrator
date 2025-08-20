const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitize HTML input to prevent XSS attacks
 * @param {string} dirty - The potentially dangerous HTML string
 * @param {object} options - Additional sanitization options
 * @returns {string} - Sanitized HTML string
 */
function sanitizeHtml(dirty, options = {}) {
  const defaultOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    ...options
  };

  // Configure DOMPurify
  const clean = DOMPurify.sanitize(dirty, defaultOptions);
  
  return clean;
}

/**
 * Sanitize plain text input (removes all HTML)
 * @param {string} text - The input text
 * @returns {string} - Plain text with HTML removed
 */
function sanitizeText(text) {
  if (!text) return '';
  
  // Remove all HTML tags
  const clean = DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true
  });
  
  // Additional escaping for special characters
  return clean
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize comment text with mention support
 * @param {string} text - The comment text
 * @returns {string} - Sanitized comment text
 */
function sanitizeComment(text) {
  if (!text) return '';
  
  // First sanitize as plain text
  let clean = sanitizeText(text);
  
  // Then convert @mentions to safe links
  clean = clean.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  
  // Convert line breaks to <br> tags
  clean = clean.replace(/\n/g, '<br>');
  
  return clean;
}

/**
 * Validate and sanitize activity details
 * @param {object} details - Activity details object
 * @returns {object} - Sanitized details
 */
function sanitizeActivityDetails(details) {
  if (!details || typeof details !== 'object') return {};
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeText(item) : item
      );
    }
    // Skip objects to prevent nested complexity
  }
  
  return sanitized;
}

module.exports = {
  sanitizeHtml,
  sanitizeText,
  sanitizeComment,
  sanitizeActivityDetails
};