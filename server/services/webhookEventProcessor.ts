import { storage } from '../storage';
import type { InsertInteraction, InsertContent, InsertContentAnalytics } from '../../shared/schema';

export interface WebhookEventProcessor {
  processFacebookEvent(entry: any, change: any): Promise<void>;
  processInstagramEvent(entry: any, change: any): Promise<void>;
  processTwitterTweetEvent(tweet: any): Promise<void>;
  processTwitterDMEvent(dm: any): Promise<void>;
  processLinkedInEvent(body: any): Promise<void>;
}

export class WebhookEventProcessorService implements WebhookEventProcessor {

  /**
   * Process Facebook page events (comments, messages, reactions)
   */
  async processFacebookEvent(entry: any, change: any): Promise<void> {
    try {
      console.log('[webhook-processor] Processing Facebook event:', change.field, change.value);

      // Handle different Facebook event types
      switch (change.field) {
        case 'feed':
          await this.processFacebookFeedEvent(entry, change.value);
          break;
        case 'conversations':
          await this.processFacebookMessageEvent(entry, change.value);
          break;
        case 'posts':
          await this.processFacebookPostEvent(entry, change.value);
          break;
        default:
          console.log('[webhook-processor] Unhandled Facebook event type:', change.field);
      }
    } catch (error) {
      console.error('[webhook-processor] Error processing Facebook event:', error);
    }
  }

  /**
   * Process Instagram events (comments, mentions, story interactions)
   */
  async processInstagramEvent(entry: any, change: any): Promise<void> {
    try {
      console.log('[webhook-processor] Processing Instagram event:', change.field, change.value);

      // Handle different Instagram event types
      switch (change.field) {
        case 'comments':
          await this.processInstagramCommentEvent(entry, change.value);
          break;
        case 'mentions':
          await this.processInstagramMentionEvent(entry, change.value);
          break;
        case 'story_insights':
          await this.processInstagramStoryEvent(entry, change.value);
          break;
        default:
          console.log('[webhook-processor] Unhandled Instagram event type:', change.field);
      }
    } catch (error) {
      console.error('[webhook-processor] Error processing Instagram event:', error);
    }
  }

  /**
   * Process Twitter tweet events (mentions, replies)
   */
  async processTwitterTweetEvent(tweet: any): Promise<void> {
    try {
      console.log('[webhook-processor] Processing Twitter tweet event:', tweet.id_str);

      // Check if this is a mention or reply to our content
      if (tweet.in_reply_to_status_id_str || await this.isMentionEvent(tweet)) {
        await this.createTwitterInteraction(tweet, 'mention');
      }
    } catch (error) {
      console.error('[webhook-processor] Error processing Twitter tweet:', error);
    }
  }

  /**
   * Process Twitter direct message events
   */
  async processTwitterDMEvent(dm: any): Promise<void> {
    try {
      console.log('[webhook-processor] Processing Twitter DM event:', dm.id);

      // Create interaction record for direct message
      await this.createTwitterInteraction(dm, 'direct_message');
    } catch (error) {
      console.error('[webhook-processor] Error processing Twitter DM:', error);
    }
  }

  /**
   * Process LinkedIn events (post engagement, messages)
   */
  async processLinkedInEvent(body: any): Promise<void> {
    try {
      console.log('[webhook-processor] Processing LinkedIn event:', body);

      // Handle different LinkedIn event types
      if (body.activity && body.activity.type) {
        await this.processLinkedInActivityEvent(body.activity);
      }

      if (body.eventType === 'DIRECT_MESSAGE') {
        await this.processLinkedInMessageEvent(body);
      }

      if (body.eventType === 'MEMBER_INTERACTION') {
        await this.processLinkedInMemberInteraction(body);
      }
    } catch (error) {
      console.error('[webhook-processor] Error processing LinkedIn event:', error);
    }
  }

  // Private helper methods for specific event processing

  private async processFacebookFeedEvent(entry: any, value: any): Promise<void> {
    // Handle Facebook feed events (comments on posts)
    if (value.item === 'comment') {
      await this.createFacebookInteraction(entry, value, 'comment');
    }
  }

  private async processFacebookMessageEvent(entry: any, value: any): Promise<void> {
    // Handle Facebook page messages
    await this.createFacebookInteraction(entry, value, 'direct_message');
  }

  private async processFacebookPostEvent(entry: any, value: any): Promise<void> {
    // Handle Facebook post events (reactions, shares)
    if (value.item === 'reaction') {
      await this.createFacebookInteraction(entry, value, 'reaction');
    }
  }

  private async processInstagramCommentEvent(entry: any, value: any): Promise<void> {
    // Handle Instagram comment events
    await this.createInstagramInteraction(entry, value, 'comment');
  }

  private async processInstagramMentionEvent(entry: any, value: any): Promise<void> {
    // Handle Instagram mention events
    await this.createInstagramInteraction(entry, value, 'mention');
  }

  private async processInstagramStoryEvent(entry: any, value: any): Promise<void> {
    // Handle Instagram story interaction events
    await this.createInstagramInteraction(entry, value, 'story_mention');
  }

  private async processLinkedInActivityEvent(activity: any): Promise<void> {
    // Handle LinkedIn post engagement (comments, reactions)
    if (activity.type === 'COMMENT') {
      await this.createLinkedInInteraction(activity, 'comment');
    } else if (activity.type === 'REACTION') {
      await this.createLinkedInInteraction(activity, 'reaction');
    }
  }

  private async processLinkedInMessageEvent(body: any): Promise<void> {
    // Handle LinkedIn direct messages
    await this.createLinkedInInteraction(body, 'direct_message');
  }

  private async processLinkedInMemberInteraction(body: any): Promise<void> {
    // Handle LinkedIn member interactions
    await this.createLinkedInInteraction(body, 'mention');
  }

  // Helper methods to create interaction records and update content

  private async createFacebookInteraction(entry: any, value: any, type: string): Promise<void> {
    try {
      // Find business connection for this Facebook page using specific page ID
      const platformConnection = await storage.getPlatformConnectionByPlatformUserId('facebook', entry.id);
      if (!platformConnection) {
        console.log('[webhook-processor] No Facebook connection found for page:', entry.id);
        return;
      }

      // Extract content information from webhook
      const postId = value.post_id || value.parent_id;
      let contentId: string | undefined;
      
      // Update or create content if this relates to a post
      if (postId) {
        contentId = await this.updateOrCreateContent({
          businessId: platformConnection.businessId,
          platform: 'facebook',
          platformPostId: postId,
          eventType: type,
          webhookData: value
        });
        
        // Update analytics for engagement
        await this.updateContentAnalytics({
          contentId: contentId!,
          platform: 'facebook',
          interactionType: type,
          webhookData: value
        });
      }

      const interactionData: InsertInteraction = {
        businessId: platformConnection.businessId,
        platform: 'facebook',
        interactionType: type,
        platformInteractionId: value.comment_id || value.message_id || value.post_id,
        fromUser: value.from?.id || 'unknown',
        fromUserDisplayName: value.from?.name,
        message: value.message || value.text || '',
        contentId,
        isRead: false
      };

      await storage.createInteraction(interactionData);
      console.log('[webhook-processor] Created Facebook interaction:', type, interactionData.platformInteractionId);
    } catch (error) {
      console.error('[webhook-processor] Error creating Facebook interaction:', error);
    }
  }

  private async createInstagramInteraction(entry: any, value: any, type: string): Promise<void> {
    try {
      // Find business connection for this Instagram account using specific account ID
      const platformConnection = await storage.getPlatformConnectionByPlatformUserId('instagram', entry.id);
      if (!platformConnection) {
        console.log('[webhook-processor] No Instagram connection found for account:', entry.id);
        return;
      }

      // Extract content information from webhook
      const postId = value.media?.id || value.object_id;
      let contentId: string | undefined;
      
      // Update or create content if this relates to a post
      if (postId) {
        contentId = await this.updateOrCreateContent({
          businessId: platformConnection.businessId,
          platform: 'instagram',
          platformPostId: postId,
          eventType: type,
          webhookData: value
        });
        
        // Update analytics for engagement
        await this.updateContentAnalytics({
          contentId: contentId!,
          platform: 'instagram',
          interactionType: type,
          webhookData: value
        });
      }

      const interactionData: InsertInteraction = {
        businessId: platformConnection.businessId,
        platform: 'instagram',
        interactionType: type,
        platformInteractionId: value.id,
        fromUser: value.from?.id || 'unknown',
        fromUserDisplayName: value.from?.username,
        message: value.text || '',
        contentId,
        isRead: false
      };

      await storage.createInteraction(interactionData);
      console.log('[webhook-processor] Created Instagram interaction:', type, interactionData.platformInteractionId);
    } catch (error) {
      console.error('[webhook-processor] Error creating Instagram interaction:', error);
    }
  }

  private async createTwitterInteraction(tweetOrDm: any, type: string): Promise<void> {
    try {
      // Find business connection for Twitter using the target account
      const targetUserId = tweetOrDm.in_reply_to_user_id_str || this.extractTwitterTargetAccount(tweetOrDm);
      const platformConnection = targetUserId 
        ? await storage.getPlatformConnectionByPlatformUserId('twitter', targetUserId)
        : await storage.getActiveConnectionByPlatform('twitter');
        
      if (!platformConnection) {
        console.log('[webhook-processor] No Twitter connection found for target user:', targetUserId);
        return;
      }

      // Extract content information from webhook
      const postId = tweetOrDm.in_reply_to_status_id_str || tweetOrDm.id_str;
      let contentId: string | undefined;
      
      // Update or create content if this relates to a post/reply
      if (postId && type !== 'direct_message') {
        contentId = await this.updateOrCreateContent({
          businessId: platformConnection.businessId,
          platform: 'twitter',
          platformPostId: postId,
          eventType: type,
          webhookData: tweetOrDm
        });
        
        // Update analytics for engagement
        await this.updateContentAnalytics({
          contentId: contentId!,
          platform: 'twitter',
          interactionType: type,
          webhookData: tweetOrDm
        });
      }

      const interactionData: InsertInteraction = {
        businessId: platformConnection.businessId,
        platform: 'twitter',
        interactionType: type,
        platformInteractionId: tweetOrDm.id_str || tweetOrDm.id,
        fromUser: tweetOrDm.user?.id_str || tweetOrDm.message_create?.sender_id || 'unknown',
        fromUserDisplayName: tweetOrDm.user?.screen_name,
        message: tweetOrDm.text || tweetOrDm.message_create?.message_data?.text || '',
        contentId,
        isRead: false
      };

      await storage.createInteraction(interactionData);
      console.log('[webhook-processor] Created Twitter interaction:', type, interactionData.platformInteractionId);
    } catch (error) {
      console.error('[webhook-processor] Error creating Twitter interaction:', error);
    }
  }

  private async createLinkedInInteraction(data: any, type: string): Promise<void> {
    try {
      // Find business connection for LinkedIn using organization/profile ID
      const organizationId = data.organization || data.object?.organization || this.extractLinkedInOrganization(data);
      const platformConnection = organizationId 
        ? await storage.getPlatformConnectionByPlatformUserId('linkedin', organizationId)
        : await storage.getActiveConnectionByPlatform('linkedin');
        
      if (!platformConnection) {
        console.log('[webhook-processor] No LinkedIn connection found for organization:', organizationId);
        return;
      }

      // Extract content information from webhook
      const postId = data.object?.id || data.activity?.object || data.targetObjectId;
      let contentId: string | undefined;
      
      // Update or create content if this relates to a post
      if (postId && type !== 'direct_message') {
        contentId = await this.updateOrCreateContent({
          businessId: platformConnection.businessId,
          platform: 'linkedin',
          platformPostId: postId,
          eventType: type,
          webhookData: data
        });
        
        // Update analytics for engagement
        await this.updateContentAnalytics({
          contentId: contentId!,
          platform: 'linkedin',
          interactionType: type,
          webhookData: data
        });
      }

      const interactionData: InsertInteraction = {
        businessId: platformConnection.businessId,
        platform: 'linkedin',
        interactionType: type,
        platformInteractionId: data.id || data.activity?.id,
        fromUser: data.actor || data.from?.id || 'unknown',
        fromUserDisplayName: data.actorName || data.from?.name,
        message: data.text || data.message || '',
        contentId,
        isRead: false
      };

      await storage.createInteraction(interactionData);
      console.log('[webhook-processor] Created LinkedIn interaction:', type, interactionData.platformInteractionId);
    } catch (error) {
      console.error('[webhook-processor] Error creating LinkedIn interaction:', error);
    }
  }

  // Content and analytics management methods

  private async updateOrCreateContent(params: {
    businessId: string;
    platform: string;
    platformPostId: string;
    eventType: string;
    webhookData: any;
  }): Promise<string> {
    try {
      // Try to find existing content by platformPostId
      const existingContent = await this.findContentByPlatformPostId(params.businessId, params.platform, params.platformPostId);
      
      if (existingContent) {
        console.log('[webhook-processor] Found existing content for post:', params.platformPostId);
        return existingContent.id;
      }
      
      // Create new content record from webhook data
      const contentData: InsertContent = {
        businessId: params.businessId,
        title: this.extractContentTitle(params.webhookData, params.platform),
        content: this.extractContentBody(params.webhookData, params.platform),
        platform: params.platform as any,
        platformPostId: params.platformPostId,
        status: 'published',
        publishedAt: new Date(),
        scheduledFor: new Date(),
        contentType: this.extractContentType(params.webhookData, params.platform)
      };
      
      const newContent = await storage.createContent(contentData);
      console.log('[webhook-processor] Created new content record:', newContent.id);
      return newContent.id;
    } catch (error) {
      console.error('[webhook-processor] Error updating/creating content:', error);
      throw error;
    }
  }

  private async updateContentAnalytics(params: {
    contentId: string;
    platform: string;
    interactionType: string;
    webhookData: any;
  }): Promise<void> {
    try {
      // Get existing analytics or create new record
      const existingAnalytics = await storage.getAnalyticsByContentId(params.contentId);
      
      const updateData: InsertContentAnalytics = {
        contentId: params.contentId,
        platform: params.platform,
        views: existingAnalytics?.views || 0,
        likes: existingAnalytics?.likes || 0,
        comments: existingAnalytics?.comments || 0,
        shares: existingAnalytics?.shares || 0,
        clicks: existingAnalytics?.clicks || 0,
        engagementRate: existingAnalytics?.engagementRate || 0
      };
      
      // Increment appropriate metric based on interaction type
      switch (params.interactionType) {
        case 'comment':
          updateData.comments = (existingAnalytics?.comments || 0) + 1;
          break;
        case 'reaction':
        case 'like':
          updateData.likes = (existingAnalytics?.likes || 0) + 1;
          break;
        case 'share':
        case 'retweet':
          updateData.shares = (existingAnalytics?.shares || 0) + 1;
          break;
      }
      
      // Recalculate engagement rate
      const totalEngagements = (updateData.likes || 0) + (updateData.comments || 0) + (updateData.shares || 0);
      const totalViews = Math.max(updateData.views || 0, totalEngagements); // Use views as base, or estimate
      if (totalViews > 0) {
        updateData.engagementRate = parseFloat(((totalEngagements / totalViews) * 100).toFixed(2));
      }
      
      await storage.upsertContentAnalytics(updateData);
      console.log('[webhook-processor] Updated analytics for content:', params.contentId, params.interactionType);
    } catch (error) {
      console.error('[webhook-processor] Error updating content analytics:', error);
    }
  }

  // Content extraction utilities

  private extractContentTitle(webhookData: any, platform: string): string {
    switch (platform) {
      case 'facebook':
        return webhookData.message?.substring(0, 100) || 'Facebook Post';
      case 'instagram':
        return webhookData.text?.substring(0, 100) || 'Instagram Post';
      case 'twitter':
        return webhookData.text?.substring(0, 100) || 'Tweet';
      case 'linkedin':
        return webhookData.text?.substring(0, 100) || 'LinkedIn Post';
      default:
        return 'Social Media Post';
    }
  }

  private extractContentBody(webhookData: any, platform: string): string {
    switch (platform) {
      case 'facebook':
        return webhookData.message || '';
      case 'instagram':
        return webhookData.text || '';
      case 'twitter':
        return webhookData.text || '';
      case 'linkedin':
        return webhookData.text || webhookData.message || '';
      default:
        return '';
    }
  }

  private extractContentType(webhookData: any, platform: string): 'educational' | 'promotional' | 'community' | 'humorous' | 'news' | 'behind_scenes' {
    // Since webhook data doesn't contain content type classification,
    // we default to 'community' for social interactions like comments/reactions
    // In a real implementation, you might use AI to classify the content type
    return 'community';
  }

  // Platform-specific utility methods

  private extractTwitterTargetAccount(tweet: any): string | null {
    // For replies, use the replied-to user
    if (tweet.in_reply_to_user_id_str) {
      return tweet.in_reply_to_user_id_str;
    }
    
    // For mentions, check if any mentioned users are our connected accounts
    if (tweet.entities?.user_mentions?.length > 0) {
      // Return the first mentioned user ID - in practice, this should be checked
      // against our connected account IDs to find the right business
      return tweet.entities.user_mentions[0].id_str;
    }
    
    return null;
  }

  private extractLinkedInOrganization(data: any): string | null {
    return data.organization?.id || 
           data.object?.organization || 
           data.activity?.object?.organization ||
           data.targetObjectId?.split('/')?.[1] || // Extract from URN format
           null;
  }

  private async findContentByPlatformPostId(businessId: string, platform: string, platformPostId: string) {
    try {
      // This is a simplified lookup - in practice, you might need to add this method to storage
      const businessContent = await storage.getContentByBusinessId(businessId, 100);
      return businessContent.find(content => 
        content.platform === platform && content.platformPostId === platformPostId
      );
    } catch (error) {
      console.error('[webhook-processor] Error finding content by platform post ID:', error);
      return null;
    }
  }

  // Utility methods

  private async findPlatformConnection(platform: string, platformUserId: string) {
    // Find platform connection by platform and platform user ID across all businesses
    return await storage.getPlatformConnectionByPlatformUserId(platform, platformUserId);
  }

  private async findPlatformConnectionByType(platform: string) {
    // Find any active connection for the platform (for platforms with single connections)
    return await storage.getActiveConnectionByPlatform(platform);
  }

  private async isMentionEvent(tweet: any): Promise<boolean> {
    // Check if tweet mentions our connected accounts
    if (!tweet.entities?.user_mentions?.length) {
      return false;
    }
    
    try {
      // Get all Twitter platform connections
      const twitterConnections = await storage.getAllActivePlatformConnections();
      const ourTwitterAccounts = twitterConnections
        .filter(conn => conn.platform === 'twitter')
        .map(conn => conn.platformUserId);
      
      // Check if any mentioned users are our connected accounts
      return tweet.entities.user_mentions.some((mention: any) => 
        ourTwitterAccounts.includes(mention.id_str)
      );
    } catch (error) {
      console.error('[webhook-processor] Error checking mention event:', error);
      return false;
    }
  }
}

// Export singleton instance
export const webhookEventProcessor = new WebhookEventProcessorService();