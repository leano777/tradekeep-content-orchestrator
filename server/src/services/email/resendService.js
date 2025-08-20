const { Resend } = require('resend');
const prisma = require('../../db');

class ResendEmailService {
  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@tradekeep.com';
    this.isConfigured = false; // Default to false
    
    if (this.apiKey && this.apiKey !== 'your-resend-api-key') {
      try {
        this.resend = new Resend(this.apiKey);
        this.isConfigured = true;
        console.log('✅ Resend API configured successfully');
      } catch (error) {
        console.log('⚠️ Resend API initialization failed - using mock implementation');
        this.isConfigured = false;
      }
    } else {
      console.log('⚠️ Resend API key not configured - using mock implementation');
    }
  }

  // Send a single email
  async sendEmail(to, subject, html, options = {}) {
    const { 
      from = this.fromEmail,
      fromName = 'TradeKeep',
      replyTo,
      text,
      tags = [],
      attachments = []
    } = options;

    if (!this.isConfigured) {
      return this.mockSendEmail(to, subject, html, options);
    }

    try {
      const response = await this.resend.emails.send({
        from: fromName ? `${fromName} <${from}>` : from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        reply_to: replyTo,
        tags,
        attachments
      });

      return {
        success: true,
        messageId: response.id,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error('Resend error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  // Send campaign to multiple recipients
  async sendCampaign(campaignId) {
    try {
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id: campaignId },
        include: {
          recipients: {
            include: {
              subscriber: true
            }
          }
        }
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'scheduled' && campaign.status !== 'draft') {
        throw new Error(`Campaign is ${campaign.status}, cannot send`);
      }

      // Update campaign status to sending
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: 'sending' }
      });

      const results = {
        successful: 0,
        failed: 0,
        errors: []
      };

      // Send emails in batches to respect rate limits
      const BATCH_SIZE = 10;
      const recipients = campaign.recipients.filter(r => 
        r.status === 'pending' && 
        r.subscriber.status === 'active'
      );

      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (recipient) => {
          try {
            // Replace variables in content
            const personalizedHtml = this.personalizeContent(
              campaign.content,
              recipient.subscriber
            );
            const personalizedText = campaign.plainText ? 
              this.personalizeContent(campaign.plainText, recipient.subscriber) : 
              undefined;

            const result = await this.sendEmail(
              recipient.subscriber.email,
              campaign.subject,
              personalizedHtml,
              {
                from: campaign.fromEmail,
                fromName: campaign.fromName,
                replyTo: campaign.replyTo,
                text: personalizedText,
                tags: ['campaign', `campaign-${campaignId}`]
              }
            );

            if (result.success) {
              // Update recipient status
              await prisma.emailCampaignRecipient.update({
                where: { id: recipient.id },
                data: {
                  status: 'sent',
                  sentAt: new Date()
                }
              });
              results.successful++;
            } else {
              results.failed++;
              results.errors.push({
                email: recipient.subscriber.email,
                error: result.error
              });
            }
          } catch (error) {
            console.error(`Failed to send to ${recipient.subscriber.email}:`, error);
            results.failed++;
            results.errors.push({
              email: recipient.subscriber.email,
              error: error.message
            });
          }
        }));

        // Add delay between batches to respect rate limits
        if (i + BATCH_SIZE < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update campaign stats and status
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: results.failed === 0 ? 'sent' : 'partial',
          sentAt: new Date(),
          sentCount: results.successful,
          totalRecipients: recipients.length
        }
      });

      return {
        success: true,
        campaignId,
        results
      };
    } catch (error) {
      console.error('Campaign send error:', error);
      
      // Update campaign status to failed
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: 'failed' }
      }).catch(console.error);

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Personalize content with subscriber data
  personalizeContent(content, subscriber) {
    let personalized = content;
    
    // Replace common variables
    personalized = personalized.replace(/\{\{name\}\}/g, subscriber.name || 'Trader');
    personalized = personalized.replace(/\{\{email\}\}/g, subscriber.email);
    personalized = personalized.replace(/\{\{unsubscribe_link\}\}/g, 
      `${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe?email=${subscriber.email}`
    );
    
    // Replace custom metadata variables if they exist
    if (subscriber.metadata) {
      try {
        const metadata = JSON.parse(subscriber.metadata);
        Object.keys(metadata).forEach(key => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          personalized = personalized.replace(regex, metadata[key]);
        });
      } catch (error) {
        console.error('Failed to parse subscriber metadata:', error);
      }
    }
    
    return personalized;
  }

  // Track email open
  async trackOpen(campaignId, subscriberId) {
    try {
      const recipient = await prisma.emailCampaignRecipient.findFirst({
        where: {
          campaignId,
          subscriberId
        }
      });

      if (recipient && recipient.status === 'sent') {
        await prisma.emailCampaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'opened',
            openedAt: recipient.openedAt || new Date(),
            openCount: { increment: 1 }
          }
        });

        // Update campaign stats
        await prisma.emailCampaign.update({
          where: { id: campaignId },
          data: {
            openCount: { increment: recipient.openCount === 0 ? 1 : 0 }
          }
        });
      }
    } catch (error) {
      console.error('Track open error:', error);
    }
  }

  // Track email click
  async trackClick(campaignId, subscriberId, url) {
    try {
      const recipient = await prisma.emailCampaignRecipient.findFirst({
        where: {
          campaignId,
          subscriberId
        }
      });

      if (recipient) {
        const isFirstClick = recipient.clickCount === 0;
        
        await prisma.emailCampaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'clicked',
            clickedAt: recipient.clickedAt || new Date(),
            clickCount: { increment: 1 }
          }
        });

        // Update campaign stats
        if (isFirstClick) {
          await prisma.emailCampaign.update({
            where: { id: campaignId },
            data: {
              clickCount: { increment: 1 }
            }
          });
        }
      }
    } catch (error) {
      console.error('Track click error:', error);
    }
  }

  // Handle unsubscribe
  async handleUnsubscribe(email) {
    try {
      await prisma.emailSubscriber.update({
        where: { email },
        data: {
          status: 'unsubscribed',
          unsubscribedAt: new Date()
        }
      });

      return { success: true, message: 'Successfully unsubscribed' };
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return { success: false, error: error.message };
    }
  }

  // Mock implementation for development
  async mockSendEmail(to, subject, html, options = {}) {
    console.log('📧 Mock Email Send:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('From:', options.fromName || 'TradeKeep');
    console.log('Preview:', html.substring(0, 200) + '...');
    
    return {
      success: true,
      messageId: 'mock_' + Date.now(),
      message: 'Mock email sent successfully',
      mock: true
    };
  }

  // Get campaign statistics
  async getCampaignStats(campaignId) {
    try {
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id: campaignId },
        include: {
          recipients: {
            select: {
              status: true,
              openCount: true,
              clickCount: true
            }
          }
        }
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const stats = {
        totalRecipients: campaign.totalRecipients,
        sent: campaign.sentCount,
        opened: campaign.openCount,
        clicked: campaign.clickCount,
        bounced: campaign.bounceCount,
        unsubscribed: campaign.unsubscribeCount,
        openRate: campaign.sentCount > 0 ? 
          ((campaign.openCount / campaign.sentCount) * 100).toFixed(2) + '%' : '0%',
        clickRate: campaign.sentCount > 0 ? 
          ((campaign.clickCount / campaign.sentCount) * 100).toFixed(2) + '%' : '0%'
      };

      return stats;
    } catch (error) {
      console.error('Get campaign stats error:', error);
      throw error;
    }
  }
}

module.exports = new ResendEmailService();