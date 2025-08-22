const msal = require('@azure/msal-node');
const prisma = require('../../db');

class MicrosoftAuthService {
  constructor() {
    // Check if credentials are available
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      console.log('⚠️ Microsoft OAuth credentials not configured - service disabled');
      this.msalClient = null;
      this.isEnabled = false;
      return;
    }

    const config = {
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        authority: 'https://login.microsoftonline.com/common'
      }
    };
    
    this.msalClient = new msal.ConfidentialClientApplication(config);
    this.isEnabled = true;
    this.redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:9000/api/v1/assets/cloud/callback/microsoft';
    
    this.scopes = [
      'User.Read',
      'Files.ReadWrite',
      'Files.ReadWrite.All',
      'offline_access'
    ];
  }

  // Generate OAuth URL for user consent
  async getAuthUrl(userId) {
    if (!this.isEnabled) {
      throw new Error('Microsoft OAuth service is not configured');
    }
    
    const authCodeUrlParameters = {
      scopes: this.scopes,
      redirectUri: this.redirectUri,
      state: userId, // Pass userId in state for callback
      prompt: 'consent'
    };
    
    const response = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
    return response;
  }

  // Handle OAuth callback and store tokens
  async handleCallback(code, userId) {
    if (!this.isEnabled) {
      throw new Error('Microsoft OAuth service is not configured');
    }
    
    try {
      const tokenRequest = {
        code,
        scopes: this.scopes,
        redirectUri: this.redirectUri
      };
      
      const response = await this.msalClient.acquireTokenByCode(tokenRequest);
      
      // Get user info from Microsoft Graph
      const userInfo = await this.getUserInfo(response.accessToken);
      
      // Store or update cloud account
      const cloudAccount = await prisma.cloudAccount.upsert({
        where: {
          userId_provider: {
            userId,
            provider: 'ONEDRIVE'
          }
        },
        create: {
          userId,
          provider: 'ONEDRIVE',
          email: userInfo.mail || userInfo.userPrincipalName,
          accessToken: this.encrypt(response.accessToken),
          refreshToken: this.encrypt(response.account.idTokenClaims.refreshToken || ''),
          tokenExpiresAt: new Date(response.expiresOn),
          isActive: true
        },
        update: {
          email: userInfo.mail || userInfo.userPrincipalName,
          accessToken: this.encrypt(response.accessToken),
          refreshToken: response.account.idTokenClaims.refreshToken ? 
            this.encrypt(response.account.idTokenClaims.refreshToken) : undefined,
          tokenExpiresAt: new Date(response.expiresOn),
          isActive: true,
          updatedAt: new Date()
        }
      });
      
      return {
        success: true,
        email: userInfo.mail || userInfo.userPrincipalName,
        accountId: cloudAccount.id
      };
    } catch (error) {
      console.error('Microsoft OAuth callback error:', error);
      throw new Error('Failed to authenticate with OneDrive');
    }
  }

  // Get user info from Microsoft Graph
  async getUserInfo(accessToken) {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get user info from Microsoft Graph');
    }
    
    return await response.json();
  }

  // Get access token for a user
  async getAccessToken(userId) {
    const account = await prisma.cloudAccount.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'ONEDRIVE'
        }
      }
    });
    
    if (!account || !account.isActive) {
      throw new Error('No active OneDrive account found');
    }
    
    // Check if token needs refresh
    const now = new Date();
    if (account.tokenExpiresAt <= now) {
      return await this.refreshAccessToken(userId);
    }
    
    return this.decrypt(account.accessToken);
  }

  // Refresh access token
  async refreshAccessToken(userId) {
    const account = await prisma.cloudAccount.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'ONEDRIVE'
        }
      }
    });
    
    if (!account) {
      throw new Error('No OneDrive account found');
    }
    
    try {
      const refreshTokenRequest = {
        refreshToken: this.decrypt(account.refreshToken),
        scopes: this.scopes
      };
      
      const response = await this.msalClient.acquireTokenByRefreshToken(refreshTokenRequest);
      
      // Update stored tokens
      await prisma.cloudAccount.update({
        where: { id: account.id },
        data: {
          accessToken: this.encrypt(response.accessToken),
          tokenExpiresAt: new Date(response.expiresOn),
          updatedAt: new Date()
        }
      });
      
      return response.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      
      // Mark account as inactive if refresh fails
      await prisma.cloudAccount.update({
        where: { id: account.id },
        data: { isActive: false }
      });
      
      throw new Error('Failed to refresh Microsoft access token');
    }
  }

  // Get authenticated Graph client
  async getGraphClient(userId) {
    const { Client } = require('@microsoft/microsoft-graph-client');
    const accessToken = await this.getAccessToken(userId);
    
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
    
    return client;
  }

  // Disconnect OneDrive account
  async disconnect(userId) {
    const account = await prisma.cloudAccount.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'ONEDRIVE'
        }
      }
    });
    
    if (account) {
      // Delete account record
      await prisma.cloudAccount.delete({
        where: { id: account.id }
      });
    }
    
    return { success: true };
  }

  // Get connected account info
  async getAccountInfo(userId) {
    const account = await prisma.cloudAccount.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'ONEDRIVE'
        }
      }
    });
    
    if (!account) {
      return null;
    }
    
    return {
      id: account.id,
      email: account.email,
      isActive: account.isActive,
      connectedAt: account.createdAt
    };
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

module.exports = new MicrosoftAuthService();