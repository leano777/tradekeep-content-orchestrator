const twitterService = require('./twitter');
const linkedinService = require('./linkedin');
const instagramService = require('./instagram');
const prisma = require('../../db');

class PublishingService {
  constructor() {
    this.platforms = {
      twitter: twitterService,
      linkedin: linkedinService,
      instagram: instagramService
    };
    
    this.platformStatus = {};
    this.checkPlatformStatus();
  }

  async checkPlatformStatus() {
    for (const [platform, service] of Object.entries(this.platforms)) {
      this.platformStatus[platform] = {
        configured: service.isConfigured || false,
        available: true
      };
    }
    console.log('📱 Social Media Platform Status:', this.platformStatus);
  }

  async publishContent(contentId, platforms = [], options = {}) {
    try {
      // Fetch content from database
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        include: {
          author: true,
          assets: {
            include: {
              asset: true
            }
          }
        }
      });

      if (!content) {
        throw new Error('Content not found');
      }

      const results = {
        contentId,
        title: content.title,
        platforms: {},
        summary: {
          successful: 0,
          failed: 0,
          skipped: 0
        }
      };

      // Get media URLs from content assets
      const mediaUrls = content.assets.map(ca => ca.asset.url);

      // Publish to each selected platform
      for (const platform of platforms) {
        if (!this.platforms[platform]) {
          results.platforms[platform] = {
            success: false,
            error: 'Platform not supported',
            skipped: true
          };
          results.summary.skipped++;
          continue;
        }

        // Format content for each platform
        const formattedContent = this.formatContentForPlatform(
          content,
          platform,
          options[platform] || {}
        );

        try {
          let publishResult;
          
          // Use mock implementation if not configured
          if (!this.platforms[platform].isConfigured) {
            console.log(`⚠️ ${platform} not configured, using mock implementation`);
            publishResult = await this.platforms[platform].mockPost(
              formattedContent,
              mediaUrls
            );
          } else {
            // Publish based on platform
            switch (platform) {
              case 'twitter':
                publishResult = await twitterService.postTweet(formattedContent, mediaUrls);
                break;
              case 'linkedin':
                publishResult = await linkedinService.postToLinkedIn(formattedContent, mediaUrls);
                break;
              case 'instagram':
                // Instagram requires at least one image
                if (mediaUrls.length === 0 && options.instagram?.mediaUrl) {
                  publishResult = await instagramService.postToInstagram(
                    formattedContent,
                    options.instagram.mediaUrl,
                    options.instagram.mediaType || 'IMAGE'
                  );
                } else if (mediaUrls.length > 0) {
                  publishResult = await instagramService.postToInstagram(
                    formattedContent,
                    mediaUrls[0],
                    'IMAGE'
                  );
                } else {
                  publishResult = {
                    success: false,
                    error: 'Instagram requires at least one image'
                  };
                }
                break;
              default:
                publishResult = {
                  success: false,
                  error: 'Platform not implemented'
                };
            }
          }

          results.platforms[platform] = publishResult;
          
          if (publishResult.success) {
            results.summary.successful++;
            
            // Store publishing record in database
            await this.storePublishingRecord(contentId, platform, publishResult);
          } else {
            results.summary.failed++;
          }
        } catch (error) {
          console.error(`Error publishing to ${platform}:`, error);
          results.platforms[platform] = {
            success: false,
            error: error.message
          };
          results.summary.failed++;
        }
      }

      // Update content status if successfully published
      if (results.summary.successful > 0) {
        await prisma.content.update({
          where: { id: contentId },
          data: {
            status: 'published',
            publishedAt: new Date()
          }
        });
      }

      return results;
    } catch (error) {
      console.error('Publishing service error:', error);
      throw error;
    }
  }

  formatContentForPlatform(content, platform, options = {}) {
    const { title, body, pillar } = content;
    const hashtags = this.getPillarHashtags(pillar);
    
    let formattedContent = '';
    
    switch (platform) {
      case 'twitter':
        // Twitter: Short and concise with hashtags
        formattedContent = title;
        if (body && body.length > 0) {
          const availableSpace = 280 - title.length - hashtags.join(' ').length - 10;
          if (availableSpace > 50) {
            formattedContent += '\n\n' + body.substring(0, availableSpace) + '...';
          }
        }
        formattedContent += '\n\n' + hashtags.join(' ');
        break;
        
      case 'linkedin':
        // LinkedIn: Professional tone with full content
        formattedContent = `${title}\n\n${body}`;
        if (options.includeHashtags !== false) {
          formattedContent += '\n\n' + hashtags.join(' ');
        }
        break;
        
      case 'instagram':
        // Instagram: Visual-focused with emojis and hashtags
        formattedContent = `${title}\n\n${body}`;
        formattedContent += '\n.\n.\n.\n' + hashtags.join(' ');
        break;
        
      default:
        formattedContent = `${title}\n\n${body}`;
    }
    
    return formattedContent;
  }

  getPillarHashtags(pillar) {
    const hashtagMap = {
      'internal-os': ['#TradingMindset', '#TraderPsychology', '#MentalEdge', '#TradeKeep'],
      'psychology-over-strategy': ['#TradingPsychology', '#EmotionalControl', '#TraderMindset', '#TradeKeep'],
      'discipline-over-dopamine': ['#TradingDiscipline', '#ConsistentTrading', '#ProcessOverProfit', '#TradeKeep'],
      'systems-vs-reactive': ['#TradingSystems', '#SystematicTrading', '#RuleBasedTrading', '#TradeKeep']
    };
    
    return hashtagMap[pillar] || ['#Trading', '#TradeKeep'];
  }

  async storePublishingRecord(contentId, platform, result) {
    try {
      // Store in the content metadata or a separate publishing table
      // For now, we'll log it
      console.log(`✅ Published content ${contentId} to ${platform}:`, {
        postId: result.postId,
        url: result.url,
        timestamp: new Date().toISOString()
      });
      
      // In production, you'd store this in a PublishingHistory table
      // await prisma.publishingHistory.create({
      //   data: {
      //     contentId,
      //     platform,
      //     platformPostId: result.postId,
      //     platformUrl: result.url,
      //     publishedAt: new Date()
      //   }
      // });
    } catch (error) {
      console.error('Failed to store publishing record:', error);
    }
  }

  async scheduleContent(contentId, platforms, scheduledTime, options = {}) {
    try {
      // Update content with scheduled time
      await prisma.content.update({
        where: { id: contentId },
        data: {
          scheduledAt: new Date(scheduledTime),
          status: 'scheduled'
        }
      });

      // In production, you'd set up a job queue (Bull, Agenda, etc.)
      // For now, we'll use setTimeout for demonstration
      const delay = new Date(scheduledTime).getTime() - Date.now();
      
      if (delay > 0) {
        setTimeout(async () => {
          console.log(`⏰ Publishing scheduled content ${contentId}`);
          await this.publishContent(contentId, platforms, options);
        }, delay);
        
        return {
          success: true,
          message: `Content scheduled for ${scheduledTime}`,
          platforms
        };
      } else {
        throw new Error('Scheduled time must be in the future');
      }
    } catch (error) {
      console.error('Scheduling error:', error);
      throw error;
    }
  }

  async getPlatformConnections() {
    const connections = {};
    
    for (const [platform, service] of Object.entries(this.platforms)) {
      if (service.getAccountInfo) {
        connections[platform] = await service.getAccountInfo();
      } else {
        connections[platform] = {
          connected: service.isConfigured || false,
          platform
        };
      }
    }
    
    return connections;
  }

  async deletePost(platform, postId) {
    if (!this.platforms[platform]) {
      throw new Error('Platform not supported');
    }

    if (this.platforms[platform].deletePost) {
      return await this.platforms[platform].deletePost(postId);
    } else {
      throw new Error('Delete not supported for this platform');
    }
  }
}

module.exports = new PublishingService();