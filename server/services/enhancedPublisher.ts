import { Content } from "@shared/schema";
import { PlatformFormatter, FormattedContent, PlatformName, PLATFORM_CONSTRAINTS } from "./platformFormatter";
import { SocialMediaManager, SocialMediaPost, PublishResult } from "./socialMediaApi";
import { storage } from "../storage";

export interface PublishingOptions {
  validateBeforePublish: boolean;
  autoFixContent: boolean;
  dryRun: boolean;
}

export interface PublishingResult {
  success: boolean;
  platform: string;
  contentId: string;
  platformPostId?: string;
  error?: string;
  warnings: string[];
  formatted: FormattedContent;
  publishResult?: PublishResult;
}

export interface BatchPublishingResult {
  results: PublishingResult[];
  successCount: number;
  failureCount: number;
  totalAttempted: number;
}

export class EnhancedPublisher {
  private socialMediaManager: SocialMediaManager | null = null;

  constructor(private businessId: string) {}

  /**
   * Initialize social media manager with platform connections
   */
  private async initializeSocialMediaManager(): Promise<void> {
    if (this.socialMediaManager) return;

    const connections = await storage.getPlatformConnectionsByBusinessId(this.businessId);
    const activeConnections = connections
      .filter(conn => conn.isActive && conn.accessToken)
      .map(conn => ({
        platform: conn.platform,
        accessToken: conn.accessToken!
      }));

    if (activeConnections.length === 0) {
      throw new Error("No active platform connections found for publishing");
    }

    this.socialMediaManager = new SocialMediaManager(activeConnections);
  }

  /**
   * Publish content to a specific platform
   */
  async publishToPlatform(contentId: string, platform: PlatformName, options: PublishingOptions = {
    validateBeforePublish: true,
    autoFixContent: true,
    dryRun: false
  }): Promise<PublishingResult> {
    
    const result: PublishingResult = {
      success: false,
      platform,
      contentId,
      warnings: [],
      formatted: {} as FormattedContent
    };

    try {
      // Get content from database
      const content = await storage.getContentById(contentId);
      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      // Verify content belongs to this business
      if (content.businessId !== this.businessId) {
        throw new Error("Content does not belong to this business");
      }

      // Format content for the platform
      const formatted = PlatformFormatter.formatForPlatform(content, platform);
      result.formatted = formatted;
      result.warnings.push(...formatted.warnings);

      // Validate content if required
      if (options.validateBeforePublish && !formatted.isValid) {
        if (options.autoFixContent && formatted.errors.length > 0) {
          // Content was already auto-fixed in formatter, but still has errors
          throw new Error(`Content validation failed: ${formatted.errors.join(', ')}`);
        } else if (!options.autoFixContent) {
          throw new Error(`Content validation failed: ${formatted.errors.join(', ')}`);
        }
      }

      // If dry run, return without publishing
      if (options.dryRun) {
        result.success = true;
        return result;
      }

      // Initialize social media manager
      await this.initializeSocialMediaManager();

      // Create social media post object
      const post: SocialMediaPost = {
        id: contentId,
        platform,
        content: formatted.text,
        imageUrl: formatted.imageUrl,
        scheduledFor: content.scheduledFor || undefined
      };

      // Publish to platform
      const publishResult = await this.socialMediaManager!.publishToPlatform(platform, post);
      result.publishResult = publishResult;

      if (publishResult.success) {
        // Update content status and platform post ID
        await storage.updateContentStatus(contentId, "published", new Date());
        if (publishResult.platformPostId) {
          await storage.updateContent(contentId, {
            platformPostId: publishResult.platformPostId,
            metadata: {
              ...content.metadata as any,
              publishedAt: new Date().toISOString(),
              platform,
              formattedContent: formatted
            }
          });
        }

        result.success = true;
        result.platformPostId = publishResult.platformPostId;
      } else {
        throw new Error(publishResult.error || "Publishing failed for unknown reason");
      }

    } catch (error) {
      result.error = (error as Error).message;
      console.error(`Publishing failed for content ${contentId} on ${platform}:`, error);
      
      // Update content status to failed if not a dry run
      if (!options.dryRun) {
        try {
          await storage.updateContentStatus(contentId, "failed");
        } catch (statusUpdateError) {
          console.error("Failed to update content status to failed:", statusUpdateError);
        }
      }
    }

    return result;
  }

  /**
   * Publish content to multiple platforms
   */
  async publishToMultiplePlatforms(
    contentId: string, 
    platforms: PlatformName[], 
    options: PublishingOptions = {
      validateBeforePublish: true,
      autoFixContent: true,
      dryRun: false
    }
  ): Promise<BatchPublishingResult> {
    
    const results: PublishingResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const platform of platforms) {
      try {
        const result = await this.publishToPlatform(contentId, platform, options);
        results.push(result);
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        const errorResult: PublishingResult = {
          success: false,
          platform,
          contentId,
          error: (error as Error).message,
          warnings: [],
          formatted: {} as FormattedContent
        };
        results.push(errorResult);
        failureCount++;
      }
    }

    return {
      results,
      successCount,
      failureCount,
      totalAttempted: platforms.length
    };
  }

  /**
   * Preview content formatting for all platforms
   */
  async previewContentForAllPlatforms(contentId: string): Promise<Record<PlatformName, FormattedContent>> {
    const content = await storage.getContentById(contentId);
    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const platforms: PlatformName[] = ['facebook', 'instagram', 'linkedin', 'twitter', 'pinterest'];
    const previews = {} as Record<PlatformName, FormattedContent>;

    for (const platform of platforms) {
      previews[platform] = PlatformFormatter.formatForPlatform(content, platform);
    }

    return previews;
  }

  /**
   * Validate content for publishing
   */
  async validateContentForPublishing(contentId: string, platforms: PlatformName[]): Promise<{
    isValid: boolean;
    platforms: Record<PlatformName, { isValid: boolean; errors: string[]; warnings: string[] }>;
  }> {
    const content = await storage.getContentById(contentId);
    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const platformResults = {} as Record<PlatformName, { isValid: boolean; errors: string[]; warnings: string[] }>;
    let overallValid = true;

    for (const platform of platforms) {
      const formatted = PlatformFormatter.formatForPlatform(content, platform);
      platformResults[platform] = {
        isValid: formatted.isValid,
        errors: formatted.errors,
        warnings: formatted.warnings
      };

      if (!formatted.isValid) {
        overallValid = false;
      }
    }

    return {
      isValid: overallValid,
      platforms: platformResults
    };
  }

  /**
   * Get publishing requirements for connected platforms
   */
  async getPublishingRequirements(): Promise<{
    connectedPlatforms: string[];
    requirements: Record<string, any>;
  }> {
    const connections = await storage.getPlatformConnectionsByBusinessId(this.businessId);
    const connectedPlatforms = connections
      .filter(conn => conn.isActive)
      .map(conn => conn.platform);

    const requirements = {} as Record<string, any>;
    
    for (const platform of connectedPlatforms) {
      if (platform in PLATFORM_CONSTRAINTS) {
        requirements[platform] = PlatformFormatter.getPlatformRequirements(platform as PlatformName);
      }
    }

    return {
      connectedPlatforms,
      requirements
    };
  }

  /**
   * Get optimization suggestions for content
   */
  async getContentOptimizationSuggestions(contentId: string): Promise<Record<PlatformName, string[]>> {
    const content = await storage.getContentById(contentId);
    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const platforms: PlatformName[] = ['facebook', 'instagram', 'linkedin', 'twitter', 'pinterest'];
    const suggestions = {} as Record<PlatformName, string[]>;

    for (const platform of platforms) {
      suggestions[platform] = PlatformFormatter.getOptimizationSuggestions(content, platform);
    }

    return suggestions;
  }

  /**
   * Schedule content for publishing
   */
  async scheduleContent(contentId: string, scheduledFor: Date, platforms: PlatformName[]): Promise<{
    success: boolean;
    message: string;
    scheduledPlatforms: string[];
  }> {
    try {
      // Validate content first
      const validation = await this.validateContentForPublishing(contentId, platforms);
      
      if (!validation.isValid) {
        const errors = Object.entries(validation.platforms)
          .filter(([_, result]) => !result.isValid)
          .map(([platform, result]) => `${platform}: ${result.errors.join(', ')}`)
          .join('; ');
        
        return {
          success: false,
          message: `Content validation failed: ${errors}`,
          scheduledPlatforms: []
        };
      }

      // Update content with scheduled time
      await storage.updateContent(contentId, {
        scheduledFor,
        status: "approved" // Content must be approved to be scheduled
      });

      return {
        success: true,
        message: `Content scheduled for ${scheduledFor.toISOString()}`,
        scheduledPlatforms: platforms
      };

    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
        scheduledPlatforms: []
      };
    }
  }
}

// Helper function to create publisher for a business
export async function createPublisher(businessId: string): Promise<EnhancedPublisher> {
  return new EnhancedPublisher(businessId);
}

// Helper function to publish specific content
export async function publishContent(contentId: string): Promise<boolean> {
  try {
    const content = await storage.getContentById(contentId);
    if (!content) {
      console.error(`Content not found: ${contentId}`);
      return false;
    }

    const publisher = new EnhancedPublisher(content.businessId);
    const result = await publisher.publishToPlatform(
      contentId, 
      content.platform as PlatformName,
      {
        validateBeforePublish: true,
        autoFixContent: true,
        dryRun: false
      }
    );

    return result.success;
  } catch (error) {
    console.error(`Failed to publish content ${contentId}:`, error);
    return false;
  }
}

export { EnhancedPublisher as Publisher };