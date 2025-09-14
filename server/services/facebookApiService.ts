import { storage } from '../storage';
import type { PlatformConnection, InsertPlatformConnection } from '../../shared/schema';

export interface FacebookAuthResult {
  success: boolean;
  connection?: PlatformConnection;
  error?: string;
}

export interface FacebookPageInfo {
  id: string;
  name: string;
  access_token: string;
  category: string;
  tasks: string[];
}

export interface InstagramBusinessAccountInfo {
  id: string;
  name: string;
  username: string;
  profile_picture_url: string;
}

export class FacebookApiService {
  private readonly baseUrl = 'https://graph.facebook.com/v19.0';
  private readonly appId: string;
  private readonly appSecret: string;

  constructor() {
    this.appId = process.env.FACEBOOK_APP_ID!;
    this.appSecret = process.env.FACEBOOK_APP_SECRET!;
    
    if (!this.appId || !this.appSecret) {
      console.warn('[facebook-api] Facebook credentials not configured - Facebook integration disabled');
    }
  }

  /**
   * Generate Facebook OAuth URL for user authorization
   */
  getOAuthUrl(businessId: string, redirectUri: string, stateId: string): string {    
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      state: stateId,
      scope: [
        'pages_manage_posts',
        'pages_read_engagement', 
        'pages_manage_metadata',
        'pages_read_user_content',
        'instagram_basic',
        'instagram_content_publish',
        'instagram_manage_messages',
        'business_management'
      ].join(','),
      response_type: 'code'
    });

    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{ accessToken: string; expiresIn: number }> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
      code
    });

    const response = await fetch(`${this.baseUrl}/oauth/access_token?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Facebook OAuth error: ${data.error?.message || 'Unknown error'}`);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600
    };
  }

  /**
   * Get long-lived access token from short-lived token
   */
  async getLongLivedToken(shortLivedToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: shortLivedToken
    });

    const response = await fetch(`${this.baseUrl}/oauth/access_token?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Facebook token exchange error: ${data.error?.message || 'Unknown error'}`);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 5184000 // 60 days default
    };
  }

  /**
   * Get user's Facebook pages
   */
  async getUserPages(accessToken: string): Promise<FacebookPageInfo[]> {
    const response = await fetch(`${this.baseUrl}/me/accounts`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Facebook API error: ${data.error?.message || 'Unknown error'}`);
    }

    return data.data || [];
  }

  /**
   * Get Instagram business accounts connected to Facebook pages
   */
  async getInstagramBusinessAccounts(pageAccessToken: string, pageId: string): Promise<InstagramBusinessAccountInfo[]> {
    const response = await fetch(
      `${this.baseUrl}/${pageId}?fields=instagram_business_account`,
      {
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`
        }
      }
    );
    const data = await response.json();

    if (!response.ok || !data.instagram_business_account) {
      return [];
    }

    const igAccountId = data.instagram_business_account.id;
    
    // Get Instagram account details
    const igResponse = await fetch(
      `${this.baseUrl}/${igAccountId}?fields=id,name,username,profile_picture_url`,
      {
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`
        }
      }
    );
    const igData = await igResponse.json();

    if (!igResponse.ok) {
      return [];
    }

    return [igData];
  }

  /**
   * Connect Facebook page to business
   */
  async connectFacebookPage(
    businessId: string, 
    pageInfo: FacebookPageInfo,
    userAccessToken: string
  ): Promise<FacebookAuthResult> {
    try {
      // Get page access token using the long-lived user token
      const pageTokenResponse = await fetch(
        `${this.baseUrl}/${pageInfo.id}?fields=access_token`,
        {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`
          }
        }
      );
      const pageTokenData = await pageTokenResponse.json();

      if (!pageTokenResponse.ok) {
        throw new Error(`Failed to get page token: ${pageTokenData.error?.message}`);
      }

      if (!pageTokenData.access_token) {
        throw new Error('No access token received for page');
      }
      
      // Get page details
      const pageResponse = await fetch(
        `${this.baseUrl}/${pageInfo.id}?fields=id,name,username,picture`,
        {
          headers: {
            'Authorization': `Bearer ${pageTokenData.access_token}`
          }
        }
      );
      const pageData = await pageResponse.json();

      if (!pageResponse.ok) {
        throw new Error(`Failed to get page details: ${pageData.error?.message}`);
      }

      const connectionData: InsertPlatformConnection = {
        businessId,
        platform: 'facebook',
        platformUserId: pageInfo.id,
        platformUsername: pageData.username || pageData.name,
        platformDisplayName: pageData.name,
        platformProfilePic: pageData.picture?.data?.url,
        accessToken: pageTokenData.access_token,
        tokenExpiry: null, // Page tokens don't expire
        tokenScopes: pageInfo.tasks,
        isActive: true,
        lastSyncAt: new Date(),
        accountInfo: {
          category: pageInfo.category,
          tasks: pageInfo.tasks,
          pageId: pageInfo.id
        }
      };

      const connection = await storage.createPlatformConnection(connectionData);
      
      console.log(`[facebook-api] Connected Facebook page ${pageData.name} for business ${businessId}`);
      
      return { success: true, connection };
    } catch (error) {
      console.error('[facebook-api] Failed to connect Facebook page:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Connect Instagram business account to business
   */
  async connectInstagramAccount(
    businessId: string,
    igAccount: InstagramBusinessAccountInfo,
    pageAccessToken: string
  ): Promise<FacebookAuthResult> {
    try {
      const connectionData: InsertPlatformConnection = {
        businessId,
        platform: 'instagram',
        platformUserId: igAccount.id,
        platformUsername: igAccount.username,
        platformDisplayName: igAccount.name,
        platformProfilePic: igAccount.profile_picture_url,
        accessToken: pageAccessToken, // Instagram uses the page token
        tokenExpiry: null, // Page tokens don't expire
        isActive: true,
        lastSyncAt: new Date(),
        accountInfo: {
          instagramBusinessAccountId: igAccount.id,
          username: igAccount.username
        }
      };

      const connection = await storage.createPlatformConnection(connectionData);
      
      console.log(`[facebook-api] Connected Instagram account @${igAccount.username} for business ${businessId}`);
      
      return { success: true, connection };
    } catch (error) {
      console.error('[facebook-api] Failed to connect Instagram account:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Refresh access token for a platform connection
   */
  async refreshAccessToken(connectionId: string): Promise<boolean> {
    try {
      const connection = await storage.getPlatformConnectionById(connectionId);
      if (!connection || !connection.accessToken) {
        return false;
      }

      // Page and Instagram tokens don't expire and can't be refreshed via fb_exchange_token
      if (connection.platform === 'facebook' || connection.platform === 'instagram') {
        console.log(`[facebook-api] Page/Instagram tokens don't expire - skipping refresh for connection ${connectionId}`);
        return true;
      }

      // Only refresh user tokens
      const longLivedToken = await this.getLongLivedToken(connection.accessToken);
      
      await storage.updatePlatformConnection(connectionId, {
        accessToken: longLivedToken.accessToken,
        tokenExpiry: new Date(Date.now() + longLivedToken.expiresIn * 1000),
        lastSyncAt: new Date()
      });

      console.log(`[facebook-api] Refreshed access token for connection ${connectionId}`);
      return true;
    } catch (error) {
      console.error(`[facebook-api] Failed to refresh token for connection ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(this.appId && this.appSecret);
  }

  /**
   * Fetch posts from a Facebook page
   */
  async fetchPagePosts(pageAccessToken: string, pageId: string, limit: number = 25, after?: string): Promise<{
    data: any[];
    paging?: { next?: string; cursors?: { after: string } };
  }> {
    const params = new URLSearchParams({
      fields: [
        'id',
        'message',
        'story', 
        'full_picture',
        'created_time',
        'updated_time',
        'type',
        'status_type',
        'permalink_url',
        'shares.summary(total_count)',
        'likes.summary(total_count)',
        'comments.summary(total_count)',
        'reactions.summary(total_count)'
      ].join(','),
      limit: limit.toString()
    });

    if (after) {
      params.append('after', after);
    }

    const response = await fetch(`${this.baseUrl}/${pageId}/posts?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${pageAccessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Facebook API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Fetch comments for a specific post
   */
  async fetchPostComments(pageAccessToken: string, postId: string, limit: number = 25, after?: string): Promise<{
    data: any[];
    paging?: { next?: string; cursors?: { after: string } };
  }> {
    const params = new URLSearchParams({
      fields: [
        'id',
        'message',
        'created_time',
        'from{id,name,picture}',
        'like_count',
        'comment_count',
        'parent{id}'
      ].join(','),
      limit: limit.toString()
    });

    if (after) {
      params.append('after', after);
    }

    const response = await fetch(`${this.baseUrl}/${postId}/comments?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${pageAccessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Facebook API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Fetch Instagram posts for a connected Instagram Business Account
   */
  async fetchInstagramPosts(pageAccessToken: string, instagramAccountId: string, limit: number = 25, after?: string): Promise<{
    data: any[];
    paging?: { next?: string; cursors?: { after: string } };
  }> {
    const params = new URLSearchParams({
      fields: [
        'id',
        'caption',
        'media_type',
        'media_url',
        'permalink',
        'timestamp',
        'like_count',
        'comments_count'
      ].join(','),
      limit: limit.toString()
    });

    if (after) {
      params.append('after', after);
    }

    const response = await fetch(`${this.baseUrl}/${instagramAccountId}/media?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${pageAccessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Instagram API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Fetch Instagram comments for a specific post
   */
  async fetchInstagramComments(pageAccessToken: string, mediaId: string, limit: number = 25, after?: string): Promise<{
    data: any[];
    paging?: { next?: string; cursors?: { after: string } };
  }> {
    const params = new URLSearchParams({
      fields: [
        'id',
        'text',
        'timestamp',
        'username',
        'from{id,username}'
      ].join(','),
      limit: limit.toString()
    });

    if (after) {
      params.append('after', after);
    }

    const response = await fetch(`${this.baseUrl}/${mediaId}/comments?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${pageAccessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Instagram API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Fetch page conversations (messages)
   */
  async fetchPageConversations(pageAccessToken: string, pageId: string, limit: number = 25, after?: string): Promise<{
    data: any[];
    paging?: { next?: string; cursors?: { after: string } };
  }> {
    const params = new URLSearchParams({
      fields: [
        'id',
        'snippet',
        'updated_time',
        'message_count',
        'unread_count',
        'participants'
      ].join(','),
      limit: limit.toString()
    });

    if (after) {
      params.append('after', after);
    }

    const response = await fetch(`${this.baseUrl}/${pageId}/conversations?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${pageAccessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Facebook API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Fetch messages in a conversation
   */
  async fetchConversationMessages(pageAccessToken: string, conversationId: string, limit: number = 25, after?: string): Promise<{
    data: any[];
    paging?: { next?: string; cursors?: { after: string } };
  }> {
    const params = new URLSearchParams({
      fields: [
        'id',
        'message',
        'created_time',
        'from{id,name,email}',
        'to{data{id,name}}',
        'attachments'
      ].join(','),
      limit: limit.toString()
    });

    if (after) {
      params.append('after', after);
    }

    const response = await fetch(`${this.baseUrl}/${conversationId}/messages?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${pageAccessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Facebook API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Reply to a Facebook comment
   */
  async replyToComment(pageAccessToken: string, commentId: string, message: string): Promise<{ id: string }> {
    const response = await fetch(`${this.baseUrl}/${commentId}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pageAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Facebook API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Reply to an Instagram comment
   */
  async replyToInstagramComment(accessToken: string, commentId: string, message: string): Promise<{ id: string }> {
    const response = await fetch(`${this.baseUrl}/${commentId}/replies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Instagram API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Send a message to a Facebook page conversation
   */
  async sendPageMessage(pageAccessToken: string, recipientId: string, message: string): Promise<{ message_id: string }> {
    const response = await fetch(`${this.baseUrl}/me/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pageAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_type: 'RESPONSE',
        recipient: { id: recipientId },
        message: { text: message }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Facebook Messenger API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Send a message to an Instagram user
   */
  async sendInstagramMessage(igBusinessAccountId: string, pageAccessToken: string, igUserId: string, message: string): Promise<{ message_id: string }> {
    const response = await fetch(`${this.baseUrl}/${igBusinessAccountId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pageAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'instagram',
        recipient: { id: igUserId },
        message: { text: message }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Instagram Messaging API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.appSecret)
      .update(payload)
      .digest('hex');
    
    return `sha256=${expectedSignature}` === signature;
  }
}

export const facebookApiService = new FacebookApiService();