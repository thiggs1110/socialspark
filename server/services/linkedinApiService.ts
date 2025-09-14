import { storage } from '../storage';
import type { PlatformConnection, InsertPlatformConnection } from '../../shared/schema';

export interface LinkedInAuthResult {
  success: boolean;
  connection?: PlatformConnection;
  error?: string;
}

export interface LinkedInUserInfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
}

export interface LinkedInOrganization {
  id: string;
  name: string;
  vanityName: string;
  logoV2?: {
    original?: string;
  };
}

export class LinkedInApiService {
  private readonly baseUrl = 'https://api.linkedin.com/v2';
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor() {
    this.clientId = process.env.LINKEDIN_CLIENT_ID!;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('[linkedin-api] LinkedIn credentials not configured - LinkedIn integration disabled');
    }
  }

  /**
   * Generate LinkedIn OAuth URL for user authorization
   */
  getOAuthUrl(businessId: string, redirectUri: string, stateId: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state: stateId,
      scope: [
        'openid',
        'profile',
        'email',
        'w_member_social',
        'w_organization_social',
        'r_organization_social'
      ].join(' ')
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{ accessToken: string; expiresIn: number }> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri
    });

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`LinkedIn OAuth error: ${data.error_description || data.error || 'Unknown error'}`);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 5184000 // 60 days default
    };
  }

  /**
   * Get authenticated user's information
   */
  async getUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${data.message || 'Unknown error'}`);
    }

    return data;
  }

  /**
   * Get user's organization pages they can manage
   */
  async getUserOrganizations(accessToken: string): Promise<LinkedInOrganization[]> {
    const response = await fetch(
      `${this.baseUrl}/organizationAcls?q=roleAssignee&projection=(elements*(organization~(id,name,vanityName,logoV2(original))))`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return [];
    }

    return data.elements?.map((element: any) => element['organization~']) || [];
  }

  /**
   * Connect LinkedIn personal profile to business
   */
  async connectLinkedInProfile(
    businessId: string,
    accessToken: string,
    expiresIn: number
  ): Promise<LinkedInAuthResult> {
    try {
      const userInfo = await this.getUserInfo(accessToken);

      const connectionData: InsertPlatformConnection = {
        businessId,
        platform: 'linkedin',
        platformUserId: userInfo.sub,
        platformUsername: userInfo.email,
        platformDisplayName: userInfo.name,
        platformProfilePic: userInfo.picture,
        accessToken,
        tokenExpiry: new Date(Date.now() + expiresIn * 1000),
        tokenScopes: ['openid', 'profile', 'email', 'w_member_social'],
        isActive: true,
        lastSyncAt: new Date(),
        accountInfo: {
          userId: userInfo.sub,
          email: userInfo.email,
          accountType: 'personal'
        }
      };

      const connection = await storage.createPlatformConnection(connectionData);
      
      console.log(`[linkedin-api] Connected LinkedIn profile ${userInfo.name} for business ${businessId}`);
      
      return { success: true, connection };
    } catch (error) {
      console.error('[linkedin-api] Failed to connect LinkedIn profile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Connect LinkedIn organization page to business
   */
  async connectLinkedInOrganization(
    businessId: string,
    organization: LinkedInOrganization,
    accessToken: string,
    expiresIn: number
  ): Promise<LinkedInAuthResult> {
    try {
      const connectionData: InsertPlatformConnection = {
        businessId,
        platform: 'linkedin',
        platformUserId: organization.id,
        platformUsername: organization.vanityName || organization.name,
        platformDisplayName: organization.name,
        platformProfilePic: organization.logoV2?.original,
        accessToken,
        tokenExpiry: new Date(Date.now() + expiresIn * 1000),
        tokenScopes: ['w_organization_social', 'r_organization_social'],
        isActive: true,
        lastSyncAt: new Date(),
        accountInfo: {
          organizationId: organization.id,
          vanityName: organization.vanityName,
          accountType: 'organization'
        }
      };

      const connection = await storage.createPlatformConnection(connectionData);
      
      console.log(`[linkedin-api] Connected LinkedIn organization ${organization.name} for business ${businessId}`);
      
      return { success: true, connection };
    } catch (error) {
      console.error('[linkedin-api] Failed to connect LinkedIn organization:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Refresh access token (LinkedIn tokens are long-lived, so this is mainly for logging)
   */
  async refreshAccessToken(connectionId: string): Promise<boolean> {
    try {
      // LinkedIn access tokens are long-lived (60 days) and cannot be refreshed
      // We just update the last sync time
      await storage.updatePlatformConnection(connectionId, {
        lastSyncAt: new Date()
      });

      console.log(`[linkedin-api] Updated sync time for connection ${connectionId}`);
      return true;
    } catch (error) {
      console.error(`[linkedin-api] Failed to update connection ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}

export const linkedinApiService = new LinkedInApiService();