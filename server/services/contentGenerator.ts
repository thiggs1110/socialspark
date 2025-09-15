import { generateContent, ContentGenerationRequest } from "./anthropic";
import { storage } from "../storage";
import type { Business, BrandVoice, PlatformConnection, InsertContent } from "@shared/schema";
// Google Nano Banana (Gemini 2.5 Flash Image) API integration
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

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
  const business = await storage.getBusinessById(request.businessId);
  if (!business) {
    console.error(`Business not found for businessId: ${request.businessId}`);
    throw new Error("Business not found");
  }

  console.log(`Found business: ${business.id} (${business.name}) for user: ${business.userId}`);

  let brandVoice = await storage.getBrandVoiceByBusinessId(business.id);
  if (!brandVoice) {
    console.log(`Brand voice not configured for businessId: ${business.id}, creating default brand voice`);
    // Create a default brand voice for the business
    const defaultBrandVoice = {
      businessId: business.id,
      tone: "Professional",
      voice: "first-person",
      brandAdjectives: ["Professional", "Reliable", "Customer-focused"],
      useEmojis: true,
      imageStyle: "professional",
      topicsToFocus: ["Industry tips", "Product features"],
      topicsToAvoid: [],
      customInstructions: "",
      contentMix: {
        educational: 40,
        promotional: 30,
        community: 20,
        humorous: 10,
      },
    };
    
    brandVoice = await storage.createBrandVoice(defaultBrandVoice);
    console.log(`Created default brand voice: ${brandVoice.id} for business: ${business.id}`);
  }

  console.log(`Found brand voice: ${brandVoice.id} with tone: ${brandVoice.tone} and voice: ${brandVoice.voice}`);

  const platformConnections = await storage.getPlatformConnectionsByBusinessId(business.id);
  const connectedPlatforms = platformConnections
    .filter(conn => conn.isActive)
    .map(conn => conn.platform);

  // For content generation, allow all requested platforms regardless of connection status
  // Content can be generated as drafts even without platform connections
  // Platform connections are only required for actual publishing
  const activePlatforms = request.platforms;

  if (activePlatforms.length === 0) {
    throw new Error("No platforms specified for content generation");
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
            useEmojis: brandVoice.useEmojis ?? true,
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
      // Generate image URL using Google Gemini 2.5 Flash Image (Nano Banana)
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

async function generateImageUrl(prompt: string): Promise<string> {
  try {
    // Initialize Google AI with the correct API key - try both GEMINI_API_KEY and GOOGLE_API_KEY
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      console.warn("No Google/Gemini API key found, using fallback images");
      return getThemeBasedFallbackImage(prompt);
    }

    const ai = new GoogleGenAI({ apiKey });

    console.log(`Generating image with Gemini 2.5 Flash Image for prompt: ${prompt}`);

    // Generate image using the correct Gemini 2.5 Flash Image API structure
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [prompt],
    });

    // Extract and save the generated image from response
    if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(`AI description: ${part.text}`);
        } else if (part.inlineData && part.inlineData.data) {
          // Generate unique filename with timestamp
          const timestamp = Date.now();
          const randomId = crypto.randomBytes(4).toString('hex');
          const filename = `generated_${timestamp}_${randomId}.png`;
          const imagePath = path.join("attached_assets", "generated_images", filename);
          
          // Convert base64 data to buffer and save to file
          const imageBuffer = Buffer.from(part.inlineData.data, "base64");
          
          // Ensure directory exists
          const directory = path.dirname(imagePath);
          if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
          }
          
          // Save image file
          fs.writeFileSync(imagePath, imageBuffer);
          
          console.log(`Successfully generated and saved image: ${imagePath}`);
          
          // Return path that can be used by frontend with @assets alias
          return `@assets/generated_images/${filename}`;
        }
      }
    }

    throw new Error("No image data found in response from Gemini 2.5 Flash Image");
  } catch (error) {
    console.error("Error generating image with Gemini 2.5 Flash Image:", error);
    console.log("Falling back to themed placeholder image");
    
    // Fallback to themed placeholder images
    return getThemeBasedFallbackImage(prompt);
  }
}

function getThemeBasedFallbackImage(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  // Business and professional themes
  if (lowerPrompt.includes("workspace") || lowerPrompt.includes("professional") || lowerPrompt.includes("office")) {
    return "https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
  }
  
  // Food and beverage themes
  if (lowerPrompt.includes("coffee") || lowerPrompt.includes("cafe") || lowerPrompt.includes("drink")) {
    return "https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
  }
  
  // Art and creative themes  
  if (lowerPrompt.includes("latte") || lowerPrompt.includes("art") || lowerPrompt.includes("creative")) {
    return "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
  }
  
  // Technology themes
  if (lowerPrompt.includes("tech") || lowerPrompt.includes("digital") || lowerPrompt.includes("computer")) {
    return "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
  }
  
  // Nature and outdoor themes
  if (lowerPrompt.includes("nature") || lowerPrompt.includes("outdoor") || lowerPrompt.includes("landscape")) {
    return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
  }
  
  // Shopping and retail themes
  if (lowerPrompt.includes("shop") || lowerPrompt.includes("product") || lowerPrompt.includes("retail")) {
    return "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
  }
  
  // Default business image
  return "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
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
