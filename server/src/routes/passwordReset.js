const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Password reset schema extension (using metadata field for reset tokens)
// In production, you'd want a separate table for password reset tokens

// Request password reset
router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store reset token in user record (using metadata field for simplicity)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // In a real app, you'd have dedicated fields or table for this
        avatar: JSON.stringify({
          resetToken: await bcrypt.hash(resetToken, 10),
          resetTokenExpiry: resetTokenExpiry.toISOString()
        })
      }
    });

    // In production, send email here
    console.log(`Password reset token for ${email}: ${resetToken}`);
    console.log(`Reset link: http://localhost:3000/reset-password?token=${resetToken}&email=${email}`);

    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.',
      // For development only - remove in production
      ...(process.env.NODE_ENV === 'development' && { 
        resetToken,
        resetLink: `http://localhost:3000/reset-password?token=${resetToken}&email=${email}`
      })
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'Email, token, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || !user.avatar) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    let resetData;
    try {
      resetData = JSON.parse(user.avatar);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check if token is expired
    if (new Date() > new Date(resetData.resetTokenExpiry)) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Verify token
    const isValidToken = await bcrypt.compare(token, resetData.resetToken);
    if (!isValidToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password and clear reset token
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        avatar: null // Clear reset token
      }
    });

    res.json({ message: 'Password successfully reset' });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Verify reset token (check if token is valid without resetting)
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: 'Email and token are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || !user.avatar) {
      return res.status(400).json({ valid: false, error: 'Invalid token' });
    }

    let resetData;
    try {
      resetData = JSON.parse(user.avatar);
    } catch (e) {
      return res.status(400).json({ valid: false, error: 'Invalid token' });
    }

    // Check if token is expired
    if (new Date() > new Date(resetData.resetTokenExpiry)) {
      return res.status(400).json({ valid: false, error: 'Token has expired' });
    }

    // Verify token
    const isValidToken = await bcrypt.compare(token, resetData.resetToken);
    if (!isValidToken) {
      return res.status(400).json({ valid: false, error: 'Invalid token' });
    }

    res.json({ valid: true, email: user.email });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ valid: false, error: 'Failed to verify token' });
  }
});

module.exports = router;