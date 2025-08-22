const client = require('prom-client');
const responseTime = require('response-time');

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeUsers = new client.Gauge({
  name: 'active_users_total',
  help: 'Number of active users',
});

const contentCreated = new client.Counter({
  name: 'content_created_total',
  help: 'Total number of content items created',
  labelNames: ['type', 'status']
});

const workflowExecutions = new client.Counter({
  name: 'workflow_executions_total',
  help: 'Total number of workflow executions',
  labelNames: ['workflow_type', 'status']
});

const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
});

const apiErrors = new client.Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['endpoint', 'error_code', 'error_type']
});

const authAttempts = new client.Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'success']
});

const fileUploads = new client.Counter({
  name: 'file_uploads_total',
  help: 'Total number of file uploads',
  labelNames: ['file_type', 'success']
});

const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type']
});

const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeUsers);
register.registerMetric(contentCreated);
register.registerMetric(workflowExecutions);
register.registerMetric(databaseQueryDuration);
register.registerMetric(apiErrors);
register.registerMetric(authAttempts);
register.registerMetric(fileUploads);
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);

// Middleware to track HTTP metrics
const metricsMiddleware = responseTime((req, res, time) => {
  const route = req.route ? req.route.path : req.path;
  const method = req.method;
  const statusCode = res.statusCode;
  
  httpRequestDuration.labels(method, route, statusCode).observe(time / 1000);
  httpRequestTotal.labels(method, route, statusCode).inc();
  
  // Track errors
  if (statusCode >= 400) {
    const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
    apiErrors.labels(route, statusCode, errorType).inc();
  }
});

// Database query tracking
const trackDatabaseQuery = (operation, table, duration) => {
  databaseQueryDuration.labels(operation, table).observe(duration / 1000);
};

// Authentication tracking
const trackAuthAttempt = (type, success) => {
  authAttempts.labels(type, success ? 'success' : 'failure').inc();
};

// Content tracking
const trackContentCreation = (type, status) => {
  contentCreated.labels(type, status).inc();
};

// Workflow tracking
const trackWorkflowExecution = (workflowType, status) => {
  workflowExecutions.labels(workflowType, status).inc();
};

// File upload tracking
const trackFileUpload = (fileType, success) => {
  fileUploads.labels(fileType, success ? 'success' : 'failure').inc();
};

// Cache tracking
const trackCacheHit = (cacheType) => {
  cacheHits.labels(cacheType).inc();
};

const trackCacheMiss = (cacheType) => {
  cacheMisses.labels(cacheType).inc();
};

// Update active users
const updateActiveUsers = (count) => {
  activeUsers.set(count);
};

// Health check metrics
const healthCheck = {
  database: new client.Gauge({
    name: 'health_database_status',
    help: 'Database health status (1 = healthy, 0 = unhealthy)',
  }),
  redis: new client.Gauge({
    name: 'health_redis_status',
    help: 'Redis health status (1 = healthy, 0 = unhealthy)',
  }),
  api: new client.Gauge({
    name: 'health_api_status',
    help: 'API health status (1 = healthy, 0 = unhealthy)',
  })
};

register.registerMetric(healthCheck.database);
register.registerMetric(healthCheck.redis);
register.registerMetric(healthCheck.api);

// Alert thresholds configuration
const alertThresholds = {
  errorRate: 0.05, // 5% error rate
  responseTime: 2000, // 2 seconds
  databaseQueryTime: 1000, // 1 second
  activeUsersMin: 0,
  cpuUsage: 80, // 80%
  memoryUsage: 85, // 85%
  diskUsage: 90 // 90%
};

// Check if metrics exceed thresholds
const checkAlertThresholds = async () => {
  const metrics = await register.getMetricsAsJSON();
  const alerts = [];
  
  // Check error rate
  const totalRequests = metrics.find(m => m.name === 'http_requests_total');
  const totalErrors = metrics.find(m => m.name === 'api_errors_total');
  
  if (totalRequests && totalErrors) {
    const errorRate = totalErrors.values[0].value / totalRequests.values[0].value;
    if (errorRate > alertThresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'high',
        message: `Error rate (${(errorRate * 100).toFixed(2)}%) exceeds threshold (${alertThresholds.errorRate * 100}%)`,
        value: errorRate
      });
    }
  }
  
  return alerts;
};

// Metrics endpoint handler
const metricsHandler = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error.message);
  }
};

module.exports = {
  register,
  metricsMiddleware,
  metricsHandler,
  trackDatabaseQuery,
  trackAuthAttempt,
  trackContentCreation,
  trackWorkflowExecution,
  trackFileUpload,
  trackCacheHit,
  trackCacheMiss,
  updateActiveUsers,
  healthCheck,
  checkAlertThresholds,
  alertThresholds
};