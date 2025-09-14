import { storage } from '../storage';
import { facebookApiService } from './facebookApiService';
import { twitterApiService } from './twitterApiService';
import { linkedinApiService } from './linkedinApiService';
import type { Interaction, PlatformConnection } from '../../shared/schema';

export interface ResponseResult {
  success: boolean;
  platform: string;
  interactionId: string;
  platformResponseId?: string;
  error?: string;
}

export interface ReplyRequest {
  interactionId: string;
  message: string;
  businessId: string;
}

export class UnifiedResponseService {
  
  /**
   * Send a reply to any social media interaction
   */
  async sendReply(request: ReplyRequest): Promise<ResponseResult> {
    const { interactionId, message, businessId } = request;

    try {
      // Get the interaction details
      const interaction = await this.getInteractionById(interactionId);
      if (!interaction) {
        throw new Error('Interaction not found');
      }

      // Verify the interaction belongs to this business
      if (interaction.businessId !== businessId) {
        throw new Error('Interaction does not belong to this business');
      }

      // Get platform connection for this interaction
      const platformConnection = await this.getPlatformConnection(interaction.platform, businessId);
      if (!platformConnection || !platformConnection.accessToken) {
        throw new Error(`No active ${interaction.platform} connection found`);
      }

      // Send reply based on platform and interaction type
      const platformResponseId = await this.routeReply(interaction, platformConnection, message);

      // Update interaction record with reply
      await storage.updateInteractionReply(interactionId, message);

      return {
        success: true,
        platform: interaction.platform,
        interactionId,
        platformResponseId
      };

    } catch (error) {
      console.error(`Failed to send reply for interaction ${interactionId}:`, error);
      
      // Get platform for better error reporting
      let platform = '';
      try {
        const interaction = await this.getInteractionById(interactionId);
        platform = interaction?.platform || '';
      } catch {
        // Ignore error when getting platform for error reporting
      }
      
      return {
        success: false,
        platform,
        interactionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Route reply to correct platform-specific method
   */
  private async routeReply(interaction: Interaction, connection: PlatformConnection, message: string): Promise<string> {
    const { platform, interactionType, platformInteractionId, fromUser } = interaction;

    switch (platform) {
      case 'facebook':
        return await this.sendFacebookReply(connection, interactionType, platformInteractionId, fromUser, message);
      
      case 'instagram':
        return await this.sendInstagramReply(connection, interactionType, platformInteractionId, fromUser, message);
      
      case 'twitter':
        return await this.sendTwitterReply(connection, interactionType, platformInteractionId, fromUser, message);
      
      case 'linkedin':
        return await this.sendLinkedInReply(connection, interactionType, platformInteractionId, fromUser, message);
      
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Send Facebook reply (comment or message)
   */
  private async sendFacebookReply(
    connection: PlatformConnection, 
    interactionType: string, 
    platformInteractionId: string, 
    fromUser: string, 
    message: string
  ): Promise<string> {
    if (!connection.accessToken) {
      throw new Error('Facebook access token not available');
    }

    switch (interactionType) {
      case 'comment':
        const commentReply = await facebookApiService.replyToComment(connection.accessToken, platformInteractionId, message);
        return commentReply.id;
      
      case 'dm':
        const messageReply = await facebookApiService.sendPageMessage(connection.accessToken, fromUser, message);
        return messageReply.message_id;
      
      default:
        throw new Error(`Unsupported Facebook interaction type: ${interactionType}`);
    }
  }

  /**
   * Send Instagram reply (comment only - DMs are handled via Facebook)
   */
  private async sendInstagramReply(
    connection: PlatformConnection, 
    interactionType: string, 
    platformInteractionId: string, 
    fromUser: string, 
    message: string
  ): Promise<string> {
    if (!connection.accessToken) {
      throw new Error('Instagram access token not available');
    }

    switch (interactionType) {
      case 'comment':
        const commentReply = await facebookApiService.replyToInstagramComment(connection.accessToken, platformInteractionId, message);
        return commentReply.id;
      
      case 'dm':
        // Instagram DMs are handled through Instagram Business API
        const accountInfo = connection.accountInfo as any;
        const igBusinessAccountId = accountInfo?.instagramBusinessAccountId;
        if (!igBusinessAccountId) {
          throw new Error('Instagram Business Account ID not found. Please reconnect your Instagram account.');
        }
        
        // Validate Instagram PSID format for DM recipient
        const validatedRecipientId = this.validateInstagramRecipientId(fromUser);
        if (!validatedRecipientId) {
          throw new Error('Invalid Instagram recipient ID format. Instagram DMs require a valid PSID (Page-Scoped ID).');
        }
        
        const messageReply = await facebookApiService.sendInstagramMessage(igBusinessAccountId, connection.accessToken, validatedRecipientId, message);
        return messageReply.message_id;
      
      default:
        throw new Error(`Unsupported Instagram interaction type: ${interactionType}`);
    }
  }

  /**
   * Send Twitter reply (tweet or DM)
   */
  private async sendTwitterReply(
    connection: PlatformConnection, 
    interactionType: string, 
    platformInteractionId: string, 
    fromUser: string, 
    message: string
  ): Promise<string> {
    if (!connection.accessToken) {
      throw new Error('Twitter access token not available');
    }

    switch (interactionType) {
      case 'comment':
      case 'mention':
        const tweetReply = await twitterApiService.replyToTweet(connection.accessToken, platformInteractionId, message);
        return tweetReply.data.id;
      
      case 'dm':
        // Check if connection has DM permissions
        if (!connection.tokenScopes?.includes('dm.write')) {
          throw new Error('Twitter DM permission required. Please reconnect your Twitter account to enable direct message replies.');
        }
        
        // Validate access token scope at runtime before API call
        try {
          const dmReply = await twitterApiService.sendDirectMessage(connection.accessToken, fromUser, message);
          return dmReply.dm_event_id;
        } catch (error) {
          // Provide clearer error message for scope issues
          if (error instanceof Error && error.message.includes('403')) {
            throw new Error('Twitter DM permission denied. Please reconnect your Twitter account with DM permissions enabled.');
          }
          throw error;
        }
      
      default:
        throw new Error(`Unsupported Twitter interaction type: ${interactionType}`);
    }
  }

  /**
   * Send LinkedIn reply (comment or message)
   */
  private async sendLinkedInReply(
    connection: PlatformConnection, 
    interactionType: string, 
    platformInteractionId: string, 
    fromUser: string, 
    message: string
  ): Promise<string> {
    if (!connection.accessToken) {
      throw new Error('LinkedIn access token not available');
    }

    switch (interactionType) {
      case 'comment':
        // Get actor URN from connection account info
        const accountInfo = connection.accountInfo as any;
        const actorUrn = accountInfo?.memberUrn || accountInfo?.organizationUrn;
        if (!actorUrn) {
          throw new Error('LinkedIn actor URN not found. Please reconnect your LinkedIn account.');
        }
        const commentReply = await linkedinApiService.replyToComment(connection.accessToken, platformInteractionId, message, actorUrn);
        return commentReply.id;
      
      case 'dm':
        // LinkedIn messaging requires complex implementation - not supported yet
        const notSupportedError = new Error('LinkedIn direct message replies are not yet supported. Please reply directly on LinkedIn.');
        (notSupportedError as any).statusCode = 400;
        (notSupportedError as any).code = 'FEATURE_NOT_SUPPORTED';
        throw notSupportedError;
      
      default:
        throw new Error(`Unsupported LinkedIn interaction type: ${interactionType}`);
    }
  }

  /**
   * Get interaction by ID
   */
  private async getInteractionById(interactionId: string): Promise<Interaction | null> {
    const interaction = await storage.getInteractionById(interactionId);
    return interaction || null;
  }

  /**
   * Get platform connection for business
   */
  private async getPlatformConnection(platform: string, businessId: string): Promise<PlatformConnection | null> {
    const connections = await storage.getPlatformConnectionsByBusinessId(businessId);
    return connections.find(c => c.platform === platform && c.isActive) || null;
  }

  /**
   * Validate Instagram recipient ID format (PSID)
   */
  private validateInstagramRecipientId(recipientId: string): string | null {
    // Instagram PSIDs are typically numeric strings of variable length
    // They should not contain @, spaces, or special characters except numbers
    if (!recipientId || typeof recipientId !== 'string') {
      return null;
    }

    // Remove any whitespace
    const cleanId = recipientId.trim();
    
    // Check if it's a valid numeric PSID format
    if (/^\d+$/.test(cleanId)) {
      return cleanId;
    }

    // If it looks like a username (@username), it's not a valid PSID
    if (cleanId.startsWith('@') || /[^0-9]/.test(cleanId)) {
      return null;
    }

    return cleanId;
  }
}

export const unifiedResponseService = new UnifiedResponseService();