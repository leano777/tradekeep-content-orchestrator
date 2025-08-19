const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8000;

// Basic middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'TradeKeep Content Orchestrator Backend'
  });
});

// API status
app.get('/api/v1/status', (req, res) => {
  res.json({
    message: 'TradeKeep Content Management System API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Basic content routes
app.get('/api/v1/content', (req, res) => {
  res.json({
    status: 'success',
    message: 'Content API ready',
    data: []
  });
});

app.post('/api/v1/content', (req, res) => {
  res.json({
    status: 'success',
    message: 'Content creation endpoint ready',
    data: { id: 'test-content', ...req.body }
  });
});

// Cloud assets routes
app.get('/api/v1/cloud-assets/status', (req, res) => {
  res.json({
    status: 'success',
    data: {
      connections: {
        googledrive: false,
        onedrive: false
      }
    }
  });
});

app.get('/api/v1/cloud-assets/files', (req, res) => {
  res.json({
    status: 'success',
    data: {
      files: []
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Route ${req.originalUrl} not found on this server`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 TradeKeep CMS Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Status: http://localhost:${PORT}/api/v1/status`);
});