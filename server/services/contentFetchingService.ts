import { storage } from '../storage';
import { facebookApiService } from './facebookApiService';
import { twitterApiService } from './twitterApiService';
import { linkedinApiService } from './linkedinApiService';
import type { 
  PlatformConnection, 
  InsertSocialMediaPost, 
  InsertInteraction,
  SocialMediaPost,
  Interaction 
} from '../../shared/schema';

export interface ContentFetchResult {
  platform: string;
  postsCount: number;
  commentsCount: number;
  messagesCount: number;
  errors: string[];
}

export interface AggregatedContent {
  posts: SocialMediaPost[];
  interactions: Interaction[];
  totalItems: number;
}

export class ContentFetchingService {
  /**
   * Fetch content from all connected platforms for a business
   */
  async fetchContentForBusiness(businessId: string, limit: number = 25): Promise<ContentFetchResult[]> {
    const connections = await storage.getPlatformConnectionsByBusinessId(businessId);
    const results: ContentFetchResult[] = [];

    for (const connection of connections) {
      if (!connection.isActive || !connection.accessToken) {
        continue;
      }

      try {
        const result = await this.fetchContentForConnection(connection, limit);
        results.push(result);
      } catch (error) {
        console.error(`[content-fetching] Failed to fetch content for ${connection.platform} connection ${connection.id}:`, error);
        results.push({
          platform: connection.platform,
          postsCount: 0,
          commentsCount: 0,
          messagesCount: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    return results;
  }

  /**
   * Fetch content from a specific platform connection
   */
  private async fetchContentForConnection(connection: PlatformConnection, limit: number = 25): Promise<ContentFetchResult> {
    switch (connection.platform) {
      case 'facebook':
        return await this.fetchFacebookContent(connection, limit);
      case 'instagram':
        return await this.fetchInstagramContent(connection, limit);
      case 'twitter':
        return await this.fetchTwitterContent(connection, limit);
      case 'linkedin':
        return await this.fetchLinkedInContent(connection, limit);
      default:
        throw new Error(`Unsupported platform: ${connection.platform}`);
    }
  }

  /**
   * Fetch Facebook content (posts, comments, messages)
   */
  private async fetchFacebookContent(connection: PlatformConnection, limit: number): Promise<ContentFetchResult> {
    const errors: string[] = [];
    let postsCount = 0;
    let commentsCount = 0;
    let messagesCount = 0;

    if (!connection.accessToken || !connection.platformUserId) {
      throw new Error('Facebook connection missing access token or platform user ID');
    }

    try {
      // Fetch page posts
      const postsResponse = await facebookApiService.fetchPagePosts(
        connection.accessToken,
        connection.platformUserId,
        limit
      );

      // Store posts in database
      for (const post of postsResponse.data || []) {
        const postData: InsertSocialMediaPost = {
          businessId: connection.businessId,
          platformConnectionId: connection.id,
          platform: 'facebook',
          platformPostId: post.id,
          postType: post.type || 'post',
          content: post.message || post.story || '',
          mediaUrls: post.full_picture ? [post.full_picture] : [],
          publishedAt: new Date(post.created_time),
          metrics: {
            likes: post.likes?.summary?.total_count || 0,
            comments: post.comments?.summary?.total_count || 0,
            shares: post.shares?.summary?.total_count || 0,
            reactions: post.reactions?.summary?.total_count || 0
          },
          isOwn: true
        };

        await storage.createSocialMediaPost(postData);
        postsCount++;

        // Fetch comments for this post
        try {
          const commentsResponse = await facebookApiService.fetchPostComments(
            connection.accessToken || '',
            post.id,
            10 // Limit comments per post
          );

          for (const comment of commentsResponse.data || []) {
            const interactionData: InsertInteraction = {
              businessId: connection.businessId,
              platform: 'facebook',
              interactionType: 'comment',
              platformInteractionId: comment.id,
              fromUser: comment.from?.id || 'unknown',
              fromUserDisplayName: comment.from?.name,
              fromUserProfilePic: comment.from?.picture?.data?.url,
              message: comment.message || '',
              contentId: undefined, // We'd need to link this to our content table
              isRead: false,
              isReplied: false
            };

            await storage.createInteraction(interactionData);
            commentsCount++;
          }
        } catch (commentError) {
          errors.push(`Failed to fetch comments for post ${post.id}: ${commentError}`);
        }
      }

      // Fetch page conversations (messages)
      try {
        const conversationsResponse = await facebookApiService.fetchPageConversations(
          connection.accessToken,
          connection.platformUserId,
          10
        );

        for (const conversation of conversationsResponse.data || []) {
          try {
            const messagesResponse = await facebookApiService.fetchConversationMessages(
              connection.accessToken || '',
              conversation.id,
              5
            );

            for (const message of messagesResponse.data || []) {
              const interactionData: InsertInteraction = {
                businessId: connection.businessId,
                platform: 'facebook',
                interactionType: 'dm',
                platformInteractionId: message.id,
                fromUser: message.from?.id || 'unknown',
                fromUserDisplayName: message.from?.name,
                message: message.message || '',
                isRead: false,
                isReplied: false
              };

              await storage.createInteraction(interactionData);
              messagesCount++;
            }
          } catch (messageError) {
            errors.push(`Failed to fetch messages for conversation ${conversation.id}: ${messageError}`);
          }
        }
      } catch (conversationError) {
        errors.push(`Failed to fetch conversations: ${conversationError}`);
      }

    } catch (error) {
      errors.push(`Failed to fetch Facebook posts: ${error}`);
    }

    return {
      platform: 'facebook',
      postsCount,
      commentsCount,
      messagesCount,
      errors
    };
  }

  /**
   * Fetch Instagram content
   */
  private async fetchInstagramContent(connection: PlatformConnection, limit: number): Promise<ContentFetchResult> {
    const errors: string[] = [];
    let postsCount = 0;
    let commentsCount = 0;
    let messagesCount = 0;

    try {
      const igAccountId = (connection.accountInfo as any)?.instagramBusinessAccountId;
      if (!igAccountId) {
        throw new Error('Instagram business account ID not found');
      }

      // Fetch Instagram posts
      const postsResponse = await facebookApiService.fetchInstagramPosts(
        connection.accessToken || '',
        igAccountId,
        limit
      );

      for (const post of postsResponse.data || []) {
        const postData: InsertSocialMediaPost = {
          businessId: connection.businessId,
          platformConnectionId: connection.id,
          platform: 'instagram',
          platformPostId: post.id,
          postType: post.media_type || 'post',
          content: post.caption || '',
          mediaUrls: post.media_url ? [post.media_url] : [],
          publishedAt: new Date(post.timestamp),
          metrics: {
            likes: post.like_count || 0,
            comments: post.comments_count || 0
          },
          isOwn: true
        };

        await storage.createSocialMediaPost(postData);
        postsCount++;

        // Fetch comments for this post
        try {
          const commentsResponse = await facebookApiService.fetchInstagramComments(
            connection.accessToken || '',
            post.id,
            10
          );

          for (const comment of commentsResponse.data || []) {
            const interactionData: InsertInteraction = {
              businessId: connection.businessId,
              platform: 'instagram',
              interactionType: 'comment',
              platformInteractionId: comment.id,
              fromUser: comment.from?.id || comment.username || 'unknown',
              fromUserDisplayName: comment.username,
              message: comment.text || '',
              isRead: false,
              isReplied: false
            };

            await storage.createInteraction(interactionData);
            commentsCount++;
          }
        } catch (commentError) {
          errors.push(`Failed to fetch Instagram comments for post ${post.id}: ${commentError}`);
        }
      }

    } catch (error) {
      errors.push(`Failed to fetch Instagram content: ${error}`);
    }

    return {
      platform: 'instagram',
      postsCount,
      commentsCount,
      messagesCount,
      errors
    };
  }

  /**
   * Fetch Twitter content
   */
  private async fetchTwitterContent(connection: PlatformConnection, limit: number): Promise<ContentFetchResult> {
    const errors: string[] = [];
    let postsCount = 0;
    let commentsCount = 0;
    let messagesCount = 0;

    if (!connection.accessToken || !connection.platformUserId) {
      throw new Error('Twitter connection missing access token or platform user ID');
    }

    try {
      // Fetch user tweets
      const tweetsResponse = await twitterApiService.fetchUserTweets(
        connection.accessToken,
        connection.platformUserId,
        limit
      );

      for (const tweet of tweetsResponse.data || []) {
        const postData: InsertSocialMediaPost = {
          businessId: connection.businessId,
          platformConnectionId: connection.id,
          platform: 'twitter',
          platformPostId: tweet.id,
          postType: 'tweet',
          content: tweet.text || '',
          publishedAt: new Date(tweet.created_at),
          metrics: {
            likes: tweet.public_metrics?.like_count || 0,
            comments: tweet.public_metrics?.reply_count || 0,
            shares: tweet.public_metrics?.retweet_count || 0,
            views: tweet.public_metrics?.impression_count || 0
          },
          isOwn: true
        };

        await storage.createSocialMediaPost(postData);
        postsCount++;
      }

      // Fetch mentions
      try {
        const mentionsResponse = await twitterApiService.fetchMentions(
          connection.accessToken,
          connection.platformUserId,
          10
        );

        for (const mention of mentionsResponse.data || []) {
          const interactionData: InsertInteraction = {
            businessId: connection.businessId,
            platform: 'twitter',
            interactionType: 'mention',
            platformInteractionId: mention.id,
            fromUser: mention.author_id || 'unknown',
            message: mention.text || '',
            isRead: false,
            isReplied: false
          };

          await storage.createInteraction(interactionData);
          commentsCount++;
        }
      } catch (mentionError) {
        errors.push(`Failed to fetch Twitter mentions: ${mentionError}`);
      }

      // Fetch direct messages (if permissions allow)
      try {
        const dmResponse = await twitterApiService.fetchDirectMessages(
          connection.accessToken || '',
          10
        );

        for (const dm of dmResponse.data || []) {
          const interactionData: InsertInteraction = {
            businessId: connection.businessId,
            platform: 'twitter',
            interactionType: 'dm',
            platformInteractionId: dm.id,
            fromUser: dm.sender_id || 'unknown',
            message: dm.text || '',
            isRead: false,
            isReplied: false
          };

          await storage.createInteraction(interactionData);
          messagesCount++;
        }
      } catch (dmError) {
        // DMs require special approval, so this is expected to fail for most apps
        console.log('[content-fetching] Twitter DM access not available (requires special approval)');
      }

    } catch (error) {
      errors.push(`Failed to fetch Twitter content: ${error}`);
    }

    return {
      platform: 'twitter',
      postsCount,
      commentsCount,
      messagesCount,
      errors
    };
  }

  /**
   * Fetch LinkedIn content
   */
  private async fetchLinkedInContent(connection: PlatformConnection, limit: number): Promise<ContentFetchResult> {
    const errors: string[] = [];
    let postsCount = 0;
    let commentsCount = 0;
    let messagesCount = 0;

    try {
      const entityUrn = (connection.accountInfo as any)?.accountType === 'organization' 
        ? `urn:li:organization:${connection.platformUserId}`
        : `urn:li:person:${connection.platformUserId}`;

      // Fetch LinkedIn posts
      const postsResponse = await linkedinApiService.fetchLinkedInPosts(
        connection.accessToken || '',
        entityUrn,
        limit
      );

      for (const post of postsResponse.elements || []) {
        const postData: InsertSocialMediaPost = {
          businessId: connection.businessId,
          platformConnectionId: connection.id,
          platform: 'linkedin',
          platformPostId: post.id,
          postType: 'post',
          content: post.commentary || post.content?.article?.description || '',
          publishedAt: new Date(post.created.time),
          metrics: {},
          isOwn: true
        };

        await storage.createSocialMediaPost(postData);
        postsCount++;

        // Fetch comments for this post
        try {
          const commentsResponse = await linkedinApiService.fetchPostComments(
            connection.accessToken!,
            post.id,
            10
          );

          for (const comment of commentsResponse.elements || []) {
            const interactionData: InsertInteraction = {
              businessId: connection.businessId,
              platform: 'linkedin',
              interactionType: 'comment',
              platformInteractionId: comment.id,
              fromUser: comment.actor || 'unknown',
              message: comment.message?.text || '',
              isRead: false,
              isReplied: false
            };

            await storage.createInteraction(interactionData);
            commentsCount++;
          }
        } catch (commentError) {
          errors.push(`Failed to fetch LinkedIn comments for post ${post.id}: ${commentError}`);
        }
      }

      // Fetch LinkedIn conversations
      try {
        const conversationsResponse = await linkedinApiService.fetchConversations(
          connection.accessToken || '',
          10
        );

        for (const conversation of conversationsResponse.elements || []) {
          try {
            const messagesResponse = await linkedinApiService.fetchConversationMessages(
              connection.accessToken || '',
              conversation.id,
              5
            );

            for (const message of messagesResponse.elements || []) {
              const interactionData: InsertInteraction = {
                businessId: connection.businessId,
                platform: 'linkedin',
                interactionType: 'dm',
                platformInteractionId: message.id,
                fromUser: message.from || 'unknown',
                message: message.body || message.attributedBody?.text || '',
                isRead: false,
                isReplied: false
              };

              await storage.createInteraction(interactionData);
              messagesCount++;
            }
          } catch (messageError) {
            errors.push(`Failed to fetch LinkedIn messages for conversation ${conversation.id}: ${messageError}`);
          }
        }
      } catch (conversationError) {
        errors.push(`Failed to fetch LinkedIn conversations: ${conversationError}`);
      }

    } catch (error) {
      errors.push(`Failed to fetch LinkedIn content: ${error}`);
    }

    return {
      platform: 'linkedin',
      postsCount,
      commentsCount,
      messagesCount,
      errors
    };
  }

  /**
   * Get aggregated content for a business (unified feed)
   */
  async getAggregatedContent(businessId: string, limit: number = 50, offset: number = 0): Promise<AggregatedContent> {
    const posts = await storage.getSocialMediaPostsByBusinessId(businessId, limit, offset);
    const interactions = await storage.getInteractionsByBusinessId(businessId, limit, offset);

    return {
      posts,
      interactions,
      totalItems: posts.length + interactions.length
    };
  }

  /**
   * Update last sync time for a connection
   */
  async updateConnectionSyncTime(connectionId: string): Promise<void> {
    await storage.updatePlatformConnection(connectionId, {
      lastSyncAt: new Date()
    });
  }

  /**
   * Sync content for all active connections (background job)
   */
  async syncAllConnections(): Promise<void> {
    console.log('[content-fetching] Starting background sync for all connections...');
    
    const allConnections = await storage.getAllActivePlatformConnections();
    
    for (const connection of allConnections) {
      try {
        console.log(`[content-fetching] Syncing ${connection.platform} connection ${connection.id}...`);
        await this.fetchContentForConnection(connection, 10); // Smaller limit for background sync
        await this.updateConnectionSyncTime(connection.id);
        console.log(`[content-fetching] Synced ${connection.platform} connection ${connection.id} successfully`);
      } catch (error) {
        console.error(`[content-fetching] Failed to sync ${connection.platform} connection ${connection.id}:`, error);
      }
    }
    
    console.log('[content-fetching] Background sync completed');
  }
}

export const contentFetchingService = new ContentFetchingService();