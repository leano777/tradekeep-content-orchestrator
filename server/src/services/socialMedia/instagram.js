const axios = require('axios');

class InstagramService {
  constructor() {
    this.userId = process.env.INSTAGRAM_USER_ID;
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    this.isConfigured = !!(this.userId && this.accessToken);
    this.apiBaseUrl = 'https://graph.facebook.com/v18.0';
    
    if (this.isConfigured) {
      console.log('✅ Instagram API configured successfully');
    } else {
      console.log('⚠️ Instagram API credentials not configured');
    }
  }

  async postToInstagram(content, mediaUrl, mediaType = 'IMAGE') {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Instagram API is not configured. Please add credentials to .env file',
        platform: 'instagram'
      };
    }

    if (!mediaUrl) {
      return {
        success: false,
        error: 'Instagram requires at least one image or video',
        platform: 'instagram'
      };
    }

    try {
      // Step 1: Create media container
      let containerData = {
        access_token: this.accessToken
      };

      if (mediaType === 'IMAGE') {
        containerData.image_url = mediaUrl;
        containerData.caption = content;
      } else if (mediaType === 'VIDEO') {
        containerData.video_url = mediaUrl;
        containerData.caption = content;
        containerData.media_type = 'VIDEO';
      } else if (mediaType === 'CAROUSEL') {
        // For carousel posts, we need to create multiple containers first
        return this.postCarousel(content, mediaUrl); // mediaUrl would be an array
      }

      // Create container
      const containerResponse = await axios.post(
        `${this.apiBaseUrl}/${this.userId}/media`,
        containerData
      );

      const containerId = containerResponse.data.id;

      // Step 2: Check container status (for videos, we need to wait for processing)
      if (mediaType === 'VIDEO') {
        await this.waitForMediaProcessing(containerId);
      }

      // Step 3: Publish the media
      const publishResponse = await axios.post(
        `${this.apiBaseUrl}/${this.userId}/media_publish`,
        {
          creation_id: containerId,
          access_token: this.accessToken
        }
      );

      const postId = publishResponse.data.id;

      return {
        success: true,
        platform: 'instagram',
        postId: postId,
        url: `https://www.instagram.com/p/${postId}`,
        message: 'Posted to Instagram successfully'
      };
    } catch (error) {
      console.error('Instagram posting error:', error.response?.data || error.message);
      return {
        success: false,
        platform: 'instagram',
        error: error.response?.data?.error?.message || error.message || 'Failed to post to Instagram'
      };
    }
  }

  async postCarousel(content, mediaUrls) {
    if (!Array.isArray(mediaUrls) || mediaUrls.length < 2 || mediaUrls.length > 10) {
      return {
        success: false,
        error: 'Carousel posts require 2-10 images',
        platform: 'instagram'
      };
    }

    try {
      // Step 1: Create containers for each image
      const containerIds = [];
      for (const mediaUrl of mediaUrls) {
        const containerResponse = await axios.post(
          `${this.apiBaseUrl}/${this.userId}/media`,
          {
            image_url: mediaUrl,
            is_carousel_item: true,
            access_token: this.accessToken
          }
        );
        containerIds.push(containerResponse.data.id);
      }

      // Step 2: Create carousel container
      const carouselResponse = await axios.post(
        `${this.apiBaseUrl}/${this.userId}/media`,
        {
          caption: content,
          media_type: 'CAROUSEL',
          children: containerIds.join(','),
          access_token: this.accessToken
        }
      );

      const carouselId = carouselResponse.data.id;

      // Step 3: Publish carousel
      const publishResponse = await axios.post(
        `${this.apiBaseUrl}/${this.userId}/media_publish`,
        {
          creation_id: carouselId,
          access_token: this.accessToken
        }
      );

      return {
        success: true,
        platform: 'instagram',
        postId: publishResponse.data.id,
        url: `https://www.instagram.com/p/${publishResponse.data.id}`,
        message: 'Carousel posted to Instagram successfully'
      };
    } catch (error) {
      console.error('Instagram carousel error:', error);
      return {
        success: false,
        platform: 'instagram',
        error: error.response?.data?.error?.message || 'Failed to post carousel to Instagram'
      };
    }
  }

  async waitForMediaProcessing(containerId, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(
          `${this.apiBaseUrl}/${containerId}`,
          {
            params: {
              fields: 'status_code',
              access_token: this.accessToken
            }
          }
        );

        if (response.data.status_code === 'FINISHED') {
          return true;
        } else if (response.data.status_code === 'ERROR') {
          throw new Error('Media processing failed');
        }

        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error checking media status:', error);
        throw error;
      }
    }
    throw new Error('Media processing timeout');
  }

  async getAccountInfo() {
    if (!this.isConfigured) {
      return {
        connected: false,
        platform: 'instagram',
        error: 'Not configured'
      };
    }

    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/${this.userId}`,
        {
          params: {
            fields: 'username,account_type,media_count',
            access_token: this.accessToken
          }
        }
      );

      return {
        connected: true,
        platform: 'instagram',
        username: response.data.username,
        accountType: response.data.account_type,
        mediaCount: response.data.media_count,
        id: this.userId
      };
    } catch (error) {
      return {
        connected: false,
        platform: 'instagram',
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  async deletePost(mediaId) {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Instagram API is not configured'
      };
    }

    try {
      await axios.delete(
        `${this.apiBaseUrl}/${mediaId}`,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        message: 'Instagram post deleted successfully'
      };
    } catch (error) {
      console.error('Instagram delete error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to delete Instagram post'
      };
    }
  }

  // Mock implementation for development/testing
  async mockPost(content, mediaUrl, mediaType = 'IMAGE') {
    console.log('📸 Mock Instagram Post:');
    console.log('Content:', content);
    console.log('Media URL:', mediaUrl);
    console.log('Media Type:', mediaType);
    
    return {
      success: true,
      platform: 'instagram',
      postId: 'mock_instagram_' + Date.now(),
      url: `https://www.instagram.com/p/mock_${Date.now()}`,
      message: 'Mock Instagram post created successfully',
      mock: true
    };
  }
}

module.exports = new InstagramService();