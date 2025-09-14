import { storage } from '../storage';
import type { PlatformConnection, InsertPlatformConnection } from '../../shared/schema';

export interface TwitterAuthResult {
  success: boolean;
  connection?: PlatformConnection;
  error?: string;
}

export interface TwitterUserInfo {
  id: string;
  username: string;
  name: string;
  profile_image_url: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

export class TwitterApiService {
  private readonly baseUrl = 'https://api.twitter.com/2';
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor() {
    this.clientId = process.env.TWITTER_CLIENT_ID!;
    this.clientSecret = process.env.TWITTER_CLIENT_SECRET!;
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('[twitter-api] Twitter credentials not configured - Twitter integration disabled');
    }
  }

  /**
   * Generate Twitter OAuth URL for user authorization
   */
  getOAuthUrl(businessId: string, redirectUri: string, stateId: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: [
        'tweet.read',
        'tweet.write',
        'users.read',
        'follows.read',
        'offline.access'
      ].join(' '),
      state: stateId,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Generate code challenge for PKCE
   */
  generateCodeChallenge(): { codeChallenge: string; codeVerifier: string } {
    const crypto = require('crypto');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    return { codeChallenge, codeVerifier };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string, codeVerifier: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    
    const params = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });

    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      },
      body: params.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Twitter OAuth error: ${data.error_description || data.error || 'Unknown error'}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in || 7200
    };
  }

  /**
   * Get authenticated user's information
   */
  async getUserInfo(accessToken: string): Promise<TwitterUserInfo> {
    const response = await fetch(
      `${this.baseUrl}/users/me?user.fields=id,username,name,profile_image_url,public_metrics`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Twitter API error: ${data.detail || 'Unknown error'}`);
    }

    return data.data;
  }

  /**
   * Connect Twitter account to business
   */
  async connectTwitterAccount(
    businessId: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): Promise<TwitterAuthResult> {
    try {
      const userInfo = await this.getUserInfo(accessToken);

      const connectionData: InsertPlatformConnection = {
        businessId,
        platform: 'twitter',
        platformUserId: userInfo.id,
        platformUsername: userInfo.username,
        platformDisplayName: userInfo.name,
        platformProfilePic: userInfo.profile_image_url,
        accessToken,
        refreshToken,
        tokenExpiry: new Date(Date.now() + expiresIn * 1000),
        tokenScopes: ['tweet.read', 'tweet.write', 'users.read', 'follows.read', 'offline.access'],
        isActive: true,
        lastSyncAt: new Date(),
        accountInfo: {
          userId: userInfo.id,
          username: userInfo.username,
          publicMetrics: userInfo.public_metrics
        }
      };

      const connection = await storage.createPlatformConnection(connectionData);
      
      console.log(`[twitter-api] Connected Twitter account @${userInfo.username} for business ${businessId}`);
      
      return { success: true, connection };
    } catch (error) {
      console.error('[twitter-api] Failed to connect Twitter account:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(connectionId: string): Promise<boolean> {
    try {
      const connection = await storage.getPlatformConnectionById(connectionId);
      if (!connection || !connection.refreshToken) {
        return false;
      }

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
        client_id: this.clientId
      });

      const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        },
        body: params.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Twitter token refresh error: ${data.error_description || 'Unknown error'}`);
      }

      await storage.updatePlatformConnection(connectionId, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || connection.refreshToken,
        tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
        lastSyncAt: new Date()
      });

      console.log(`[twitter-api] Refreshed access token for connection ${connectionId}`);
      return true;
    } catch (error) {
      console.error(`[twitter-api] Failed to refresh token for connection ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Fetch user's tweets
   */
  async fetchUserTweets(accessToken: string, userId: string, maxResults: number = 25, paginationToken?: string): Promise<{
    data: any[];
    meta?: { next_token?: string; result_count: number };
  }> {
    const params = new URLSearchParams({
      'tweet.fields': [
        'id',
        'text',
        'created_at',
        'public_metrics',
        'possibly_sensitive',
        'reply_settings',
        'source',
        'context_annotations',
        'entities',
        'in_reply_to_user_id',
        'referenced_tweets',
        'attachments'
      ].join(','),
      'user.fields': 'id,username,name,profile_image_url',
      'media.fields': 'url,type,width,height,preview_image_url',
      'expansions': 'author_id,attachments.media_keys,referenced_tweets.id',
      'max_results': maxResults.toString()
    });

    if (paginationToken) {
      params.append('pagination_token', paginationToken);
    }

    const response = await fetch(`${this.baseUrl}/users/${userId}/tweets?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Twitter API error: ${error.detail || error.title || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Fetch mentions of the authenticated user
   */
  async fetchMentions(accessToken: string, userId: string, maxResults: number = 25, paginationToken?: string): Promise<{
    data: any[];
    meta?: { next_token?: string; result_count: number };
  }> {
    const params = new URLSearchParams({
      'tweet.fields': [
        'id',
        'text',
        'created_at',
        'public_metrics',
        'author_id',
        'in_reply_to_user_id',
        'referenced_tweets',
        'context_annotations'
      ].join(','),
      'user.fields': 'id,username,name,profile_image_url',
      'expansions': 'author_id,referenced_tweets.id',
      'max_results': maxResults.toString()
    });

    if (paginationToken) {
      params.append('pagination_token', paginationToken);
    }

    const response = await fetch(`${this.baseUrl}/users/${userId}/mentions?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Twitter API error: ${error.detail || error.title || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Fetch direct messages (requires special approval from Twitter)
   */
  async fetchDirectMessages(accessToken: string, maxResults: number = 25, paginationToken?: string): Promise<{
    data: any[];
    meta?: { next_token?: string; result_count: number };
  }> {
    const params = new URLSearchParams({
      'dm_event.fields': [
        'id',
        'text',
        'created_at',
        'sender_id',
        'participant_ids',
        'referenced_tweet',
        'media_keys',
        'attachments'
      ].join(','),
      'user.fields': 'id,username,name,profile_image_url',
      'media.fields': 'url,type,width,height',
      'expansions': 'sender_id,participant_ids,referenced_tweet.id,attachments.media_keys',
      'max_results': maxResults.toString()
    });

    if (paginationToken) {
      params.append('pagination_token', paginationToken);
    }

    const response = await fetch(`${this.baseUrl}/dm_events?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Twitter API error: ${error.detail || error.title || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}

export const twitterApiService = new TwitterApiService();