const { TwitterApi } = require('twitter-api-v2');

class TwitterService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.initializeClient();
  }

  initializeClient() {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (apiKey && apiSecret && accessToken && accessSecret) {
      try {
        this.client = new TwitterApi({
          appKey: apiKey,
          appSecret: apiSecret,
          accessToken: accessToken,
          accessSecret: accessSecret,
        });
        this.isConfigured = true;
        console.log('✅ Twitter API configured successfully');
      } catch (error) {
        console.error('❌ Twitter API configuration failed:', error.message);
        this.isConfigured = false;
      }
    } else {
      console.log('⚠️ Twitter API credentials not configured');
      this.isConfigured = false;
    }
  }

  async postTweet(content, mediaUrls = []) {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Twitter API is not configured. Please add credentials to .env file',
        platform: 'twitter'
      };
    }

    try {
      // Truncate content if it exceeds Twitter's character limit
      const maxLength = 280;
      let tweetText = content;
      if (content.length > maxLength) {
        tweetText = content.substring(0, maxLength - 3) + '...';
      }

      // Upload media if provided
      const mediaIds = [];
      for (const mediaUrl of mediaUrls) {
        try {
          // In production, you'd download the image and upload it
          // For now, we'll skip media upload in the mock
          console.log(`Would upload media: ${mediaUrl}`);
        } catch (error) {
          console.error('Media upload failed:', error);
        }
      }

      // Post the tweet
      const tweet = await this.client.v2.tweet({
        text: tweetText,
        ...(mediaIds.length > 0 && { media: { media_ids: mediaIds } })
      });

      return {
        success: true,
        platform: 'twitter',
        postId: tweet.data.id,
        url: `https://twitter.com/user/status/${tweet.data.id}`,
        message: 'Tweet posted successfully'
      };
    } catch (error) {
      console.error('Twitter posting error:', error);
      return {
        success: false,
        platform: 'twitter',
        error: error.message || 'Failed to post to Twitter'
      };
    }
  }

  async deleteTweet(tweetId) {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Twitter API is not configured'
      };
    }

    try {
      await this.client.v2.deleteTweet(tweetId);
      return {
        success: true,
        message: 'Tweet deleted successfully'
      };
    } catch (error) {
      console.error('Twitter delete error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete tweet'
      };
    }
  }

  async getAccountInfo() {
    if (!this.isConfigured) {
      return {
        connected: false,
        platform: 'twitter',
        error: 'Not configured'
      };
    }

    try {
      const me = await this.client.v2.me();
      return {
        connected: true,
        platform: 'twitter',
        username: me.data.username,
        name: me.data.name,
        id: me.data.id
      };
    } catch (error) {
      return {
        connected: false,
        platform: 'twitter',
        error: error.message
      };
    }
  }

  // Mock implementation for development/testing
  async mockPost(content, mediaUrls = []) {
    console.log('📱 Mock Twitter Post:');
    console.log('Content:', content);
    console.log('Media:', mediaUrls);
    
    return {
      success: true,
      platform: 'twitter',
      postId: 'mock_tweet_' + Date.now(),
      url: `https://twitter.com/user/status/mock_${Date.now()}`,
      message: 'Mock tweet posted successfully',
      mock: true
    };
  }
}

module.exports = new TwitterService();