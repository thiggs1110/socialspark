import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateBatchContent, saveBatchContentAsDrafts, scheduleContent, publishContent } from "./services/contentGenerator";
import { generateReplyToInteraction, analyzeWebsiteForBrandVoice } from "./services/openai";
import { SocialMediaManager } from "./services/socialMediaApi";
import { insertBusinessSchema, insertBrandVoiceSchema, insertPlatformConnectionSchema, insertSchedulingSettingsSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // After authentication fix, req.user now contains the database user data directly
      const user = {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        profileImageUrl: req.user.profileImageUrl
      };
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Business routes
  app.post('/api/business', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertBusinessSchema.parse({
        ...req.body,
        userId,
      });

      const business = await storage.createBusiness(validatedData);
      res.json(business);
    } catch (error) {
      console.error("Error creating business:", error);
      res.status(500).json({ message: "Failed to create business" });
    }
  });

  app.get('/api/business', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      res.json(business);
    } catch (error) {
      console.error("Error fetching business:", error);
      res.status(500).json({ message: "Failed to fetch business" });
    }
  });

  // Brand voice routes
  app.post('/api/brand-voice', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const validatedData = insertBrandVoiceSchema.parse({
        ...req.body,
        businessId: business.id,
      });

      const brandVoice = await storage.createBrandVoice(validatedData);
      res.json(brandVoice);
    } catch (error) {
      console.error("Error creating brand voice:", error);
      res.status(500).json({ message: "Failed to create brand voice" });
    }
  });

  app.get('/api/brand-voice', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const brandVoice = await storage.getBrandVoiceByBusinessId(business.id);
      res.json(brandVoice);
    } catch (error) {
      console.error("Error fetching brand voice:", error);
      res.status(500).json({ message: "Failed to fetch brand voice" });
    }
  });

  // Platform connections routes
  app.post('/api/platform-connections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const validatedData = insertPlatformConnectionSchema.parse({
        ...req.body,
        businessId: business.id,
      });

      const connection = await storage.createPlatformConnection(validatedData);
      
      // Return safe connection data (without tokens) for security
      const safeConnection = {
        id: connection.id,
        platform: connection.platform,
        platformUserId: connection.platformUserId,
        isActive: connection.isActive,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      };
      
      res.json(safeConnection);
    } catch (error) {
      console.error("Error creating platform connection:", error);
      res.status(500).json({ message: "Failed to create platform connection" });
    }
  });

  app.get('/api/platform-connections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const connections = await storage.getPlatformConnectionsByBusinessId(business.id);
      
      // Redact sensitive token information before sending to client
      const safeConnections = connections.map(connection => ({
        id: connection.id,
        platform: connection.platform,
        platformUserId: connection.platformUserId,
        isActive: connection.isActive,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
        // accessToken and refreshToken deliberately omitted for security
      }));
      
      res.json(safeConnections);
    } catch (error) {
      console.error("Error fetching platform connections:", error);
      res.status(500).json({ message: "Failed to fetch platform connections" });
    }
  });

  // Platform connection management endpoints
  app.patch('/api/platform-connections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      // First, verify ownership by checking if connection belongs to user's business
      const existingConnections = await storage.getPlatformConnectionsByBusinessId(business.id);
      const connectionToUpdate = existingConnections.find(conn => conn.id === id);
      
      if (!connectionToUpdate) {
        return res.status(404).json({ message: "Platform connection not found or unauthorized" });
      }

      // Only allow updating specific safe fields (not businessId or tokens)
      const allowedUpdates = {
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
        ...(req.body.platformUserId && { platformUserId: req.body.platformUserId }),
      };

      const connection = await storage.updatePlatformConnection(id, allowedUpdates);
      if (!connection) {
        return res.status(404).json({ message: "Platform connection not found" });
      }

      // Return safe connection data (without tokens)
      const safeConnection = {
        id: connection.id,
        platform: connection.platform,
        platformUserId: connection.platformUserId,
        isActive: connection.isActive,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      };

      res.json(safeConnection);
    } catch (error) {
      console.error("Error updating platform connection:", error);
      res.status(500).json({ message: "Failed to update platform connection" });
    }
  });

  app.delete('/api/platform-connections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      // First, verify ownership by checking if connection belongs to user's business
      const existingConnections = await storage.getPlatformConnectionsByBusinessId(business.id);
      const connectionToDelete = existingConnections.find(conn => conn.id === id);
      
      if (!connectionToDelete) {
        return res.status(404).json({ message: "Platform connection not found or unauthorized" });
      }

      await storage.deletePlatformConnection(id);
      res.json({ message: "Platform connection deleted successfully" });
    } catch (error) {
      console.error("Error deleting platform connection:", error);
      res.status(500).json({ message: "Failed to delete platform connection" });
    }
  });

  // Content generation routes
  app.post('/api/content/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const { platforms, contentTypes, specialInstructions, quantity = 1 } = req.body;

      if (!platforms || !contentTypes) {
        return res.status(400).json({ message: "Platforms and content types are required" });
      }

      const generatedPosts = await generateBatchContent({
        businessId: business.id,
        platforms,
        contentTypes,
        specialInstructions,
        quantity,
      });

      const savedContentIds = await saveBatchContentAsDrafts(business.id, generatedPosts);

      res.json({
        message: "Content generated successfully",
        generatedCount: generatedPosts.length,
        savedContentIds,
      });
    } catch (error) {
      console.error("Error generating content:", error);
      res.status(500).json({ message: "Failed to generate content" });
    }
  });

  // Content management routes
  app.get('/api/content', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const { status, limit = 20 } = req.query;
      let content;

      if (status === 'pending') {
        content = await storage.getPendingContent(business.id);
      } else {
        content = await storage.getContentByBusinessId(business.id, parseInt(limit as string));
      }

      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.patch('/api/content/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { scheduledFor } = req.body;
      const userId = req.user.id;
      
      // Verify ownership - ensure content belongs to user's business
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const content = await storage.getContentById(id);
      if (!content || content.businessId !== business.id) {
        return res.status(404).json({ message: "Content not found or unauthorized" });
      }

      const updatedContent = await storage.updateContentStatus(id, "approved");
      
      if (scheduledFor) {
        await scheduleContent(id, new Date(scheduledFor));
      }

      res.json(updatedContent);
    } catch (error) {
      console.error("Error approving content:", error);
      res.status(500).json({ message: "Failed to approve content" });
    }
  });

  app.patch('/api/content/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Verify ownership - ensure content belongs to user's business
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const content = await storage.getContentById(id);
      if (!content || content.businessId !== business.id) {
        return res.status(404).json({ message: "Content not found or unauthorized" });
      }

      const updatedContent = await storage.updateContentStatus(id, "rejected");
      res.json(updatedContent);
    } catch (error) {
      console.error("Error rejecting content:", error);
      res.status(500).json({ message: "Failed to reject content" });
    }
  });

  app.patch('/api/content/:id/publish', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Verify ownership - ensure content belongs to user's business
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const content = await storage.getContentById(id);
      if (!content || content.businessId !== business.id) {
        return res.status(404).json({ message: "Content not found or unauthorized" });
      }

      const success = await publishContent(id);
      
      if (success) {
        res.json({ message: "Content published successfully" });
      } else {
        res.status(500).json({ message: "Failed to publish content" });
      }
    } catch (error) {
      console.error("Error publishing content:", error);
      res.status(500).json({ message: "Failed to publish content" });
    }
  });

  // Calendar and scheduling routes
  app.get('/api/content/scheduled', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const { startDate, endDate } = req.query;
      const scheduledContent = await storage.getScheduledContent(
        business.id, 
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(scheduledContent);
    } catch (error) {
      console.error("Error fetching scheduled content:", error);
      res.status(500).json({ message: "Failed to fetch scheduled content" });
    }
  });

  app.patch('/api/content/:id/schedule', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { scheduledFor } = req.body;
      const userId = req.user.id;

      if (!scheduledFor) {
        return res.status(400).json({ message: "Scheduled date is required" });
      }
      
      // Verify ownership - ensure content belongs to user's business
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const content = await storage.getContentById(id);
      if (!content || content.businessId !== business.id) {
        return res.status(404).json({ message: "Content not found or unauthorized" });
      }

      // Update content with scheduled time and approve it for publishing
      const updatedContent = await storage.updateContentStatus(id, "approved");
      await scheduleContent(id, new Date(scheduledFor));
      
      res.json(updatedContent);
    } catch (error) {
      console.error("Error scheduling content:", error);
      res.status(500).json({ message: "Failed to schedule content" });
    }
  });

  app.get('/api/content/publishing-queue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const queuedContent = await storage.getPublishingQueue(business.id);
      res.json(queuedContent);
    } catch (error) {
      console.error("Error fetching publishing queue:", error);
      res.status(500).json({ message: "Failed to fetch publishing queue" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const stats = await storage.getDashboardStats(business.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Interaction management routes
  app.get('/api/interactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log(`[DEBUG] Fetching interactions for userId: ${userId}`);
      
      const business = await storage.getBusinessByUserId(userId);
      console.log(`[DEBUG] Found business:`, business ? { id: business.id, name: business.name } : 'null');
      
      if (!business) {
        console.log(`[DEBUG] No business found for userId: ${userId}`);
        return res.status(404).json({ message: "Business not found" });
      }

      const { unreadOnly = false } = req.query;
      console.log(`[DEBUG] Fetching interactions for businessId: ${business.id}, unreadOnly: ${unreadOnly}`);
      
      const interactions = await storage.getInteractionsByBusinessId(business.id, unreadOnly === 'true');
      console.log(`[DEBUG] Found ${interactions.length} interactions:`, interactions.map(i => ({ 
        id: i.id, 
        message: i.message, 
        fromUser: i.fromUser,
        isRead: i.isRead 
      })));
      
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  app.post('/api/interactions/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      // Verify ownership - ensure interaction belongs to user's business
      const interactions = await storage.getInteractionsByBusinessId(business.id);
      const interaction = interactions.find(i => i.id === id);
      
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }

      await storage.markInteractionAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking interaction as read:", error);
      res.status(500).json({ message: "Failed to mark interaction as read" });
    }
  });

  app.post('/api/interactions/:id/reply', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reply } = req.body;

      if (!reply) {
        return res.status(400).json({ message: "Reply is required" });
      }

      const updatedInteraction = await storage.updateInteractionReply(id, reply);
      res.json(updatedInteraction);
    } catch (error) {
      console.error("Error replying to interaction:", error);
      res.status(500).json({ message: "Failed to reply to interaction" });
    }
  });

  app.post('/api/interactions/:id/generate-reply', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      const brandVoice = await storage.getBrandVoiceByBusinessId(business!.id);
      
      const { id } = req.params;
      const interaction = await storage.getInteractionsByBusinessId(business!.id);
      const targetInteraction = interaction.find(i => i.id === id);

      if (!targetInteraction) {
        return res.status(404).json({ message: "Interaction not found" });
      }

      const suggestedReply = await generateReplyToInteraction(
        targetInteraction.message,
        business!.name,
        {
          tone: brandVoice?.tone || "professional",
          voice: brandVoice?.voice || "first-person",
          brandAdjectives: brandVoice?.brandAdjectives || [],
        }
      );

      res.json({ suggestedReply });
    } catch (error) {
      console.error("Error generating reply:", error);
      res.status(500).json({ message: "Failed to generate reply" });
    }
  });

  // Website analysis for onboarding
  app.post('/api/analyze-website', isAuthenticated, async (req: any, res) => {
    try {
      const { websiteUrl } = req.body;

      if (!websiteUrl) {
        return res.status(400).json({ message: "Website URL is required" });
      }

      // Mock website content analysis
      // In production, this would scrape the website
      const mockWebsiteContent = "Premium coffee roastery serving artisanal blends and locally sourced beans. We pride ourselves on quality, community, and exceptional customer service.";
      
      const analysis = await analyzeWebsiteForBrandVoice(mockWebsiteContent);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing website:", error);
      res.status(500).json({ message: "Failed to analyze website" });
    }
  });

  // Scheduling settings routes
  app.post('/api/scheduling-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const validatedData = insertSchedulingSettingsSchema.parse({
        ...req.body,
        businessId: business.id,
      });

      const settings = await storage.createSchedulingSettings(validatedData);
      res.json(settings);
    } catch (error) {
      console.error("Error creating scheduling settings:", error);
      res.status(500).json({ message: "Failed to create scheduling settings" });
    }
  });

  app.get('/api/scheduling-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const settings = await storage.getSchedulingSettingsByBusinessId(business.id);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching scheduling settings:", error);
      res.status(500).json({ message: "Failed to fetch scheduling settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
