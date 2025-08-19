const express = require('express');
const router = express.Router();

// Placeholder cloud asset routes
router.get('/status', (req, res) => {
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

router.get('/files', (req, res) => {
  res.json({
    status: 'success',
    data: {
      files: []
    }
  });
});

module.exports = router;