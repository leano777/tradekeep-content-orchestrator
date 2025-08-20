/**
 * Simple in-memory rate limiter for WebSocket events
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // Default: 1 minute
    this.maxRequests = options.maxRequests || 100; // Default: 100 requests
    this.clients = new Map();
    
    // Clean up old entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.windowMs);
  }

  /**
   * Check if a client can make a request
   * @param {string} clientId - Unique identifier for the client
   * @returns {boolean} - Whether the request is allowed
   */
  check(clientId) {
    const now = Date.now();
    const client = this.clients.get(clientId);

    if (!client) {
      // First request from this client
      this.clients.set(clientId, {
        requests: 1,
        firstRequestTime: now,
        lastRequestTime: now
      });
      return true;
    }

    // Check if window has expired
    if (now - client.firstRequestTime > this.windowMs) {
      // Reset the window
      this.clients.set(clientId, {
        requests: 1,
        firstRequestTime: now,
        lastRequestTime: now
      });
      return true;
    }

    // Check if limit is exceeded
    if (client.requests >= this.maxRequests) {
      return false;
    }

    // Increment request count
    client.requests++;
    client.lastRequestTime = now;
    return true;
  }

  /**
   * Clean up old entries
   */
  cleanup() {
    const now = Date.now();
    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastRequestTime > this.windowMs * 2) {
        this.clients.delete(clientId);
      }
    }
  }

  /**
   * Get remaining requests for a client
   * @param {string} clientId 
   * @returns {number}
   */
  getRemainingRequests(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return this.maxRequests;
    
    const now = Date.now();
    if (now - client.firstRequestTime > this.windowMs) {
      return this.maxRequests;
    }
    
    return Math.max(0, this.maxRequests - client.requests);
  }

  /**
   * Reset limits for a specific client
   * @param {string} clientId 
   */
  reset(clientId) {
    this.clients.delete(clientId);
  }

  /**
   * Destroy the rate limiter
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clients.clear();
  }
}

/**
 * Create rate limiters for different event types
 */
class EventRateLimiters {
  constructor() {
    this.limiters = {
      'content-change': new RateLimiter({ windowMs: 1000, maxRequests: 10 }), // 10 per second
      'cursor-update': new RateLimiter({ windowMs: 1000, maxRequests: 30 }), // 30 per second
      'add-comment': new RateLimiter({ windowMs: 60000, maxRequests: 10 }), // 10 per minute
      'activity': new RateLimiter({ windowMs: 60000, maxRequests: 30 }), // 30 per minute
      'join-content': new RateLimiter({ windowMs: 60000, maxRequests: 5 }), // 5 per minute
      'default': new RateLimiter({ windowMs: 60000, maxRequests: 100 }) // Default: 100 per minute
    };
  }

  /**
   * Check if an event is allowed for a client
   * @param {string} eventType 
   * @param {string} clientId 
   * @returns {boolean}
   */
  checkEvent(eventType, clientId) {
    const limiter = this.limiters[eventType] || this.limiters['default'];
    return limiter.check(clientId);
  }

  /**
   * Get remaining requests for an event type
   * @param {string} eventType 
   * @param {string} clientId 
   * @returns {number}
   */
  getRemainingRequests(eventType, clientId) {
    const limiter = this.limiters[eventType] || this.limiters['default'];
    return limiter.getRemainingRequests(clientId);
  }

  /**
   * Reset all limits for a client
   * @param {string} clientId 
   */
  resetClient(clientId) {
    for (const limiter of Object.values(this.limiters)) {
      limiter.reset(clientId);
    }
  }

  /**
   * Destroy all rate limiters
   */
  destroy() {
    for (const limiter of Object.values(this.limiters)) {
      limiter.destroy();
    }
  }
}

module.exports = {
  RateLimiter,
  EventRateLimiters
};