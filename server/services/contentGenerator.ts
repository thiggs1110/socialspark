import { generateContent, ContentGenerationRequest } from "./openai";
import { storage } from "../storage";
import type { Business, BrandVoice, PlatformConnection, InsertContent } from "@shared/schema";

export interface BatchContentGenerationRequest {
  businessId: string;
  platforms: string[];
  contentTypes: string[];
  specialInstructions?: string;
  quantity: number; // Number of posts per platform
}

export interface GeneratedPost {
  platform: string;
  contentType: string;
  title?: string;
  content: string;
  hashtags: string[];
  imagePrompt: string;
}

export async function generateBatchContent(request: BatchContentGenerationRequest): Promise<GeneratedPost[]> {
  // Get business and brand voice information
  const business = await storage.getBusinessByUserId(request.businessId);
  if (!business) {
    throw new Error("Business not found");
  }

  const brandVoice = await storage.getBrandVoiceByBusinessId(business.id);
  if (!brandVoice) {
    throw new Error("Brand voice not configured");
  }

  const platformConnections = await storage.getPlatformConnectionsByBusinessId(business.id);
  const activePlatforms = platformConnections
    .filter(conn => conn.isActive && request.platforms.includes(conn.platform))
    .map(conn => conn.platform);

  if (activePlatforms.length === 0) {
    throw new Error("No active platforms found for content generation");
  }

  const generatedPosts: GeneratedPost[] = [];

  // Generate content for each platform and content type combination
  for (const platform of activePlatforms) {
    for (const contentType of request.contentTypes) {
      for (let i = 0; i < request.quantity; i++) {
        const contentRequest: ContentGenerationRequest = {
          businessName: business.name,
          businessDescription: business.description || "",
          industry: business.industry || "",
          platform,
          contentType,
          brandVoice: {
            tone: brandVoice.tone,
            voice: brandVoice.voice,
            brandAdjectives: brandVoice.brandAdjectives || [],
            useEmojis: brandVoice.useEmojis || true,
          },
          specialInstructions: request.specialInstructions,
        };

        try {
          const generatedContent = await generateContent(contentRequest);
          generatedPosts.push({
            platform,
            contentType,
            ...generatedContent,
          });
        } catch (error) {
          console.error(`Error generating content for ${platform} - ${contentType}:`, error);
          // Continue with other content generation even if one fails
        }
      }
    }
  }

  return generatedPosts;
}

export async function saveBatchContentAsDrafts(
  businessId: string, 
  posts: GeneratedPost[]
): Promise<string[]> {
  const savedContentIds: string[] = [];

  for (const post of posts) {
    try {
      // Generate image URL using Nano Banana API (mocked for now)
      const imageUrl = await generateImageUrl(post.imagePrompt);

      const contentData: InsertContent = {
        businessId,
        platform: post.platform,
        contentType: post.contentType as any,
        status: "pending_approval",
        title: post.title,
        content: post.content,
        hashtags: post.hashtags,
        imageUrl,
        imagePrompt: post.imagePrompt,
        scheduledFor: null, // Will be set when approved
      };

      const savedContent = await storage.createContent(contentData);
      savedContentIds.push(savedContent.id);
    } catch (error) {
      console.error("Error saving content:", error);
      // Continue with other content even if one fails to save
    }
  }

  return savedContentIds;
}

// Mock function for Nano Banana API - replace with actual API call
async function generateImageUrl(prompt: string): Promise<string> {
  // In production, this would call the Nano Banana API
  // For now, return a placeholder based on the prompt content
  
  // Mock different image styles based on prompt keywords
  if (prompt.toLowerCase().includes("coffee")) {
    return "https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
  } else if (prompt.toLowerCase().includes("workspace") || prompt.toLowerCase().includes("professional")) {
    return "https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
  } else if (prompt.toLowerCase().includes("latte") || prompt.toLowerCase().includes("art")) {
    return "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
  } else {
    return "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
  }
}

export async function scheduleContent(
  contentId: string,
  scheduledTime: Date
): Promise<void> {
  const content = await storage.getContentById(contentId);
  if (!content) {
    throw new Error("Content not found");
  }

  // Update the content with scheduled time
  await storage.updateContentStatus(contentId, "approved", scheduledTime);

  // In production, this would integrate with a job scheduler
  // For now, we'll just mark it as approved with a scheduled time
}

export async function publishContent(contentId: string): Promise<boolean> {
  const content = await storage.getContentById(contentId);
  if (!content) {
    throw new Error("Content not found");
  }

  try {
    // In production, this would publish to the actual social media platform
    // For now, we'll just mark it as published
    await storage.updateContentStatus(contentId, "published", new Date());
    return true;
  } catch (error) {
    console.error("Error publishing content:", error);
    await storage.updateContentStatus(contentId, "failed");
    return false;
  }
}
