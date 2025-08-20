const axios = require('axios');

class LinkedInService {
  constructor() {
    this.accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    this.personUrn = process.env.LINKEDIN_PERSON_URN;
    this.isConfigured = !!(this.accessToken && this.personUrn);
    this.apiBaseUrl = 'https://api.linkedin.com/v2';
    
    if (this.isConfigured) {
      console.log('✅ LinkedIn API configured successfully');
    } else {
      console.log('⚠️ LinkedIn API credentials not configured');
    }
  }

  async postToLinkedIn(content, mediaUrls = []) {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'LinkedIn API is not configured. Please add credentials to .env file',
        platform: 'linkedin'
      };
    }

    try {
      const postData = {
        author: `urn:li:person:${this.personUrn}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: mediaUrls.length > 0 ? 'IMAGE' : 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      // Add media if provided
      if (mediaUrls.length > 0) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = mediaUrls.map(url => ({
          status: 'READY',
          description: {
            text: 'Image from TradeKeep Content'
          },
          media: url,
          title: {
            text: 'TradeKeep Content'
          }
        }));
      }

      const response = await axios.post(
        `${this.apiBaseUrl}/ugcPosts`,
        postData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      const postId = response.headers['x-restli-id'] || response.data.id;
      
      return {
        success: true,
        platform: 'linkedin',
        postId: postId,
        url: `https://www.linkedin.com/feed/update/${postId}`,
        message: 'Posted to LinkedIn successfully'
      };
    } catch (error) {
      console.error('LinkedIn posting error:', error.response?.data || error.message);
      return {
        success: false,
        platform: 'linkedin',
        error: error.response?.data?.message || error.message || 'Failed to post to LinkedIn'
      };
    }
  }

  async getAccountInfo() {
    if (!this.isConfigured) {
      return {
        connected: false,
        platform: 'linkedin',
        error: 'Not configured'
      };
    }

    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/me`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return {
        connected: true,
        platform: 'linkedin',
        name: `${response.data.firstName.localized.en_US} ${response.data.lastName.localized.en_US}`,
        id: response.data.id
      };
    } catch (error) {
      return {
        connected: false,
        platform: 'linkedin',
        error: error.response?.data?.message || error.message
      };
    }
  }

  async deletePost(postId) {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'LinkedIn API is not configured'
      };
    }

    try {
      await axios.delete(
        `${this.apiBaseUrl}/ugcPosts/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return {
        success: true,
        message: 'LinkedIn post deleted successfully'
      };
    } catch (error) {
      console.error('LinkedIn delete error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to delete LinkedIn post'
      };
    }
  }

  // Mock implementation for development/testing
  async mockPost(content, mediaUrls = []) {
    console.log('💼 Mock LinkedIn Post:');
    console.log('Content:', content);
    console.log('Media:', mediaUrls);
    
    return {
      success: true,
      platform: 'linkedin',
      postId: 'mock_linkedin_' + Date.now(),
      url: `https://www.linkedin.com/feed/update/mock_${Date.now()}`,
      message: 'Mock LinkedIn post created successfully',
      mock: true
    };
  }
}

module.exports = new LinkedInService();