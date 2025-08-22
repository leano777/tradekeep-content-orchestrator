const { google } = require('googleapis');
const prisma = require('../../db');

class GoogleAuthService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:9000/api/v1/assets/cloud/callback/google'
    );
    
    this.scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
  }

  // Generate OAuth URL for user consent
  getAuthUrl(userId) {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      state: userId, // Pass userId in state for callback
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  // Handle OAuth callback and store tokens
  async handleCallback(code, userId) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Get user email from Google
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();
      
      // Store or update cloud account
      const cloudAccount = await prisma.cloudAccount.upsert({
        where: {
          userId_provider: {
            userId,
            provider: 'GOOGLE_DRIVE'
          }
        },
        create: {
          userId,
          provider: 'GOOGLE_DRIVE',
          email: data.email,
          accessToken: this.encrypt(tokens.access_token),
          refreshToken: this.encrypt(tokens.refresh_token),
          tokenExpiresAt: new Date(tokens.expiry_date),
          isActive: true
        },
        update: {
          email: data.email,
          accessToken: this.encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? this.encrypt(tokens.refresh_token) : undefined,
          tokenExpiresAt: new Date(tokens.expiry_date),
          isActive: true,
          updatedAt: new Date()
        }
      });
      
      return {
        success: true,
        email: data.email,
        accountId: cloudAccount.id
      };
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      throw new Error('Failed to authenticate with Google Drive');
    }
  }

  // Get authenticated client for a user
  async getAuthenticatedClient(userId) {
    const account = await prisma.cloudAccount.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'GOOGLE_DRIVE'
        }
      }
    });
    
    if (!account || !account.isActive) {
      throw new Error('No active Google Drive account found');
    }
    
    // Check if token needs refresh
    const now = new Date();
    if (account.tokenExpiresAt <= now) {
      await this.refreshAccessToken(userId);
      return this.getAuthenticatedClient(userId); // Recursive call with new token
    }
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({
      access_token: this.decrypt(account.accessToken),
      refresh_token: this.decrypt(account.refreshToken)
    });
    
    return oauth2Client;
  }

  // Refresh access token
  async refreshAccessToken(userId) {
    const account = await prisma.cloudAccount.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'GOOGLE_DRIVE'
        }
      }
    });
    
    if (!account || !account.refreshToken) {
      throw new Error('Cannot refresh token: No refresh token available');
    }
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({
      refresh_token: this.decrypt(account.refreshToken)
    });
    
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update stored tokens
      await prisma.cloudAccount.update({
        where: { id: account.id },
        data: {
          accessToken: this.encrypt(credentials.access_token),
          tokenExpiresAt: new Date(credentials.expiry_date),
          updatedAt: new Date()
        }
      });
      
      return credentials;
    } catch (error) {
      console.error('Token refresh error:', error);
      
      // Mark account as inactive if refresh fails
      await prisma.cloudAccount.update({
        where: { id: account.id },
        data: { isActive: false }
      });
      
      throw new Error('Failed to refresh Google access token');
    }
  }

  // Disconnect Google Drive account
  async disconnect(userId) {
    const account = await prisma.cloudAccount.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'GOOGLE_DRIVE'
        }
      }
    });
    
    if (account) {
      // Revoke token if possible
      try {
        const oauth2Client = await this.getAuthenticatedClient(userId);
        await oauth2Client.revokeCredentials();
      } catch (error) {
        console.log('Could not revoke Google token:', error.message);
      }
      
      // Delete account record
      await prisma.cloudAccount.delete({
        where: { id: account.id }
      });
    }
    
    return { success: true };
  }

  // Simple encryption/decryption (use proper encryption in production)
  encrypt(text) {
    if (!text) return null;
    // In production, use proper encryption like crypto-js or node's crypto module
    return Buffer.from(text).toString('base64');
  }

  decrypt(text) {
    if (!text) return null;
    return Buffer.from(text, 'base64').toString('utf8');
  }
}

module.exports = new GoogleAuthService();