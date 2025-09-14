import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateBatchContent, saveBatchContentAsDrafts, scheduleContent } from "./services/contentGenerator";
import { EnhancedPublisher, publishContent } from "./services/enhancedPublisher";
import { generateReplyToInteraction, analyzeWebsiteForBrandVoice } from "./services/openai";
import { SocialMediaManager } from "./services/socialMediaApi";
import { insertBusinessSchema, insertBrandVoiceSchema, insertPlatformConnectionSchema, insertSchedulingSettingsSchema } from "@shared/schema";
import { z } from "zod";

// Enhanced publishing validation schemas
const platformPublishSchema = z.object({
  validateBeforePublish: z.boolean().default(true),
  autoFixContent: z.boolean().default(true),
  dryRun: z.boolean().default(false)
});

const multiPlatformPublishSchema = z.object({
  platforms: z.array(z.enum(['facebook', 'instagram', 'linkedin', 'twitter', 'pinterest'])).min(1),
  validateBeforePublish: z.boolean().default(true),
  autoFixContent: z.boolean().default(true),
  dryRun: z.boolean().default(false)
});

const scheduleEnhancedSchema = z.object({
  scheduledFor: z.string().datetime(),
  platforms: z.array(z.enum(['facebook', 'instagram', 'linkedin', 'twitter', 'pinterest'])).min(1)
});

const platformEnum = z.enum(['facebook', 'instagram', 'linkedin', 'twitter', 'pinterest']);

// Crypto utility functions for secure OAuth
function generateSecureNonce(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

function generatePKCEPair() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

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

  // OAuth initiation routes for each platform
  app.get('/api/oauth/:platform/authorize', isAuthenticated, async (req: any, res) => {
    try {
      const { platform } = req.params;
      const userId = req.user.id;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      // Generate secure state nonce and store in session
      const stateNonce = generateSecureNonce();
      
      // Initialize OAuth session storage if it doesn't exist
      if (!req.session.oauth) {
        req.session.oauth = {};
      }
      
      // Store secure context in session (not in client-controlled state)
      req.session.oauth[stateNonce] = {
        userId,
        businessId: business.id,
        platform,
        createdAt: Date.now(),
        expiresAt: Date.now() + (10 * 60 * 1000) // 10 minute expiry
      };

      // For Twitter, generate PKCE parameters
      if (platform === 'twitter') {
        const { codeVerifier, codeChallenge } = generatePKCEPair();
        req.session.oauth[stateNonce].codeVerifier = codeVerifier;
        req.session.oauth[stateNonce].codeChallenge = codeChallenge;
      }

      const oauthUrls = {
        facebook: () => {
          const clientId = process.env.FACEBOOK_CLIENT_ID;
          const redirectUri = encodeURIComponent(`${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/oauth/facebook/callback`);
          const scope = encodeURIComponent('pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish');
          return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${stateNonce}`;
        },
        linkedin: () => {
          const clientId = process.env.LINKEDIN_CLIENT_ID;
          const redirectUri = encodeURIComponent(`${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/oauth/linkedin/callback`);
          const scope = encodeURIComponent('w_member_social');
          return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${stateNonce}`;
        },
        twitter: () => {
          const clientId = process.env.TWITTER_CLIENT_ID;
          const redirectUri = encodeURIComponent(`${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/oauth/twitter/callback`);
          const scope = encodeURIComponent('tweet.read tweet.write users.read');
          const codeChallenge = req.session.oauth[stateNonce].codeChallenge;
          return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${stateNonce}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
        },
        pinterest: () => {
          const clientId = process.env.PINTEREST_CLIENT_ID;
          const redirectUri = encodeURIComponent(`${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/oauth/pinterest/callback`);
          const scope = encodeURIComponent('boards:read,pins:read,pins:write');
          return `https://www.pinterest.com/oauth/?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${stateNonce}`;
        }
      };

      const authUrlGenerator = oauthUrls[platform as keyof typeof oauthUrls];
      if (!authUrlGenerator) {
        return res.status(400).json({ message: "Unsupported platform" });
      }

      const authUrl = authUrlGenerator();
      res.json({ authUrl });
    } catch (error) {
      console.error(`Error initiating ${req.params.platform} OAuth:`, error);
      res.status(500).json({ message: "Failed to initiate OAuth" });
    }
  });

  // OAuth callback routes for each platform
  app.get('/api/oauth/:platform/callback', async (req: any, res) => {
    try {
      const { platform } = req.params;
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(`/platforms?error=oauth_error&platform=${platform}&details=${encodeURIComponent(error as string)}`);
      }

      if (!code || !state) {
        return res.redirect(`/platforms?error=oauth_missing_params&platform=${platform}`);
      }

      // Validate state against session-stored OAuth context
      const oauthContext = req.session?.oauth?.[state as string];
      if (!oauthContext) {
        console.error('OAuth state validation failed: no matching session context found');
        return res.redirect(`/platforms?error=oauth_state_invalid&platform=${platform}`);
      }

      // Check if state has expired (10 minute window)
      if (Date.now() > oauthContext.expiresAt) {
        console.error('OAuth state validation failed: state expired');
        delete req.session.oauth[state as string];
        return res.redirect(`/platforms?error=oauth_state_expired&platform=${platform}`);
      }

      // Verify platform matches
      if (oauthContext.platform !== platform) {
        console.error('OAuth state validation failed: platform mismatch');
        delete req.session.oauth[state as string];
        return res.redirect(`/platforms?error=oauth_platform_mismatch&platform=${platform}`);
      }

      const { userId, businessId } = oauthContext;
      
      // Clean up used state from session
      delete req.session.oauth[state as string];

      // Exchange code for access token based on platform
      const tokenHandlers = {
        facebook: async (authCode: string) => {
          const clientId = process.env.FACEBOOK_CLIENT_ID;
          const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
          const redirectUri = `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/oauth/facebook/callback`;
          
          const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${authCode}&redirect_uri=${encodeURIComponent(redirectUri)}`);
          const tokenData = await tokenResponse.json();
          
          if (tokenData.error) {
            throw new Error(`Facebook OAuth error: ${tokenData.error.message}`);
          }

          // Get user info from Facebook
          const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${tokenData.access_token}&fields=id,name,email`);
          const userData = await userResponse.json();

          return {
            accessToken: tokenData.access_token,
            refreshToken: null,
            tokenExpiry: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
            platformUserId: userData.id,
            settings: { 
              userName: userData.name, 
              email: userData.email,
              tokenType: 'user_access_token'
            }
          };
        },
        linkedin: async (authCode: string) => {
          const clientId = process.env.LINKEDIN_CLIENT_ID;
          const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
          const redirectUri = `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/oauth/linkedin/callback`;
          
          const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: authCode,
              redirect_uri: redirectUri,
              client_id: clientId!,
              client_secret: clientSecret!
            })
          });
          
          const tokenData = await tokenResponse.json();
          
          if (tokenData.error) {
            throw new Error(`LinkedIn OAuth error: ${tokenData.error_description}`);
          }

          // Get user info from LinkedIn
          const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
          });
          const userData = await userResponse.json();

          return {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
            tokenExpiry: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
            platformUserId: userData.sub,
            settings: { 
              userName: userData.name, 
              email: userData.email 
            }
          };
        },
        twitter: async (authCode: string) => {
          const clientId = process.env.TWITTER_CLIENT_ID;
          const clientSecret = process.env.TWITTER_CLIENT_SECRET;
          const redirectUri = `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/oauth/twitter/callback`;
          
          // Use the code_verifier from session-stored PKCE data
          const codeVerifier = oauthContext.codeVerifier;
          if (!codeVerifier) {
            throw new Error('Missing PKCE code_verifier in session');
          }
          
          const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: authCode,
              redirect_uri: redirectUri,
              code_verifier: codeVerifier
            })
          });
          
          const tokenData = await tokenResponse.json();
          
          if (tokenData.error) {
            throw new Error(`Twitter OAuth error: ${tokenData.error_description}`);
          }

          // Get user info from Twitter
          const userResponse = await fetch('https://api.twitter.com/2/users/me', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
          });
          const userData = await userResponse.json();

          return {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
            tokenExpiry: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
            platformUserId: userData.data?.id,
            settings: { 
              userName: userData.data?.username, 
              displayName: userData.data?.name 
            }
          };
        },
        pinterest: async (authCode: string) => {
          const clientId = process.env.PINTEREST_CLIENT_ID;
          const clientSecret = process.env.PINTEREST_CLIENT_SECRET;
          const redirectUri = `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/oauth/pinterest/callback`;
          
          const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: authCode,
              redirect_uri: redirectUri,
              client_id: clientId!,
              client_secret: clientSecret!
            })
          });
          
          const tokenData = await tokenResponse.json();
          
          if (tokenData.error) {
            throw new Error(`Pinterest OAuth error: ${tokenData.error_description}`);
          }

          // Get user info from Pinterest
          const userResponse = await fetch('https://api.pinterest.com/v5/user_account', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
          });
          const userData = await userResponse.json();

          return {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
            tokenExpiry: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
            platformUserId: userData.username,
            settings: { 
              userName: userData.username,
              accountType: userData.account_type 
            }
          };
        }
      };

      const tokenHandler = tokenHandlers[platform as keyof typeof tokenHandlers];
      if (!tokenHandler) {
        return res.redirect(`/?error=unsupported_platform&platform=${platform}`);
      }

      const tokenData = await tokenHandler(code as string);

      // Store the platform connection
      await storage.createPlatformConnection({
        businessId,
        platform,
        platformUserId: tokenData.platformUserId,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiry: tokenData.tokenExpiry,
        isActive: true,
        settings: tokenData.settings
      });

      // Redirect back to platform connections page with success
      res.redirect(`/platforms?success=connected&platform=${platform}`);
    } catch (error) {
      console.error(`Error handling ${req.params.platform} OAuth callback:`, error);
      res.redirect(`/platforms?error=oauth_callback_error&platform=${req.params.platform}&details=${encodeURIComponent((error as Error).message)}`);
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

  app.patch('/api/content/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, content: contentText, hashtags } = req.body;
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

      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (contentText !== undefined) updates.content = contentText;
      if (hashtags !== undefined) updates.hashtags = hashtags;

      const updatedContent = await storage.updateContent(id, updates);
      res.json(updatedContent);
    } catch (error) {
      console.error("Error updating content:", error);
      res.status(500).json({ message: "Failed to update content" });
    }
  });

  app.delete('/api/content/:id', isAuthenticated, async (req: any, res) => {
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

      await storage.deleteContent(id);
      res.json({ message: "Content deleted successfully" });
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ message: "Failed to delete content" });
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

  // Enhanced Publishing Routes
  
  // Platform-specific content publishing
  app.post('/api/content/:id/publish/:platform', isAuthenticated, async (req: any, res) => {
    try {
      const { id, platform } = req.params;
      
      // Validate platform parameter
      const validatedPlatform = platformEnum.parse(platform);
      const validatedBody = platformPublishSchema.parse(req.body);
      const { validateBeforePublish, autoFixContent, dryRun } = validatedBody;
      const userId = req.user.id;
      
      // Verify ownership
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const content = await storage.getContentById(id);
      if (!content || content.businessId !== business.id) {
        return res.status(404).json({ message: "Content not found or unauthorized" });
      }

      const publisher = new EnhancedPublisher(business.id);
      const result = await publisher.publishToPlatform(id, validatedPlatform, {
        validateBeforePublish,
        autoFixContent,
        dryRun
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error publishing to platform:", error);
      res.status(500).json({ message: "Failed to publish to platform", error: (error as Error).message });
    }
  });

  // Multi-platform content publishing
  app.post('/api/content/:id/publish-multi', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedBody = multiPlatformPublishSchema.parse(req.body);
      const { platforms, validateBeforePublish, autoFixContent, dryRun } = validatedBody;
      const userId = req.user.id;
      
      // Verify ownership
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const content = await storage.getContentById(id);
      if (!content || content.businessId !== business.id) {
        return res.status(404).json({ message: "Content not found or unauthorized" });
      }

      const publisher = new EnhancedPublisher(business.id);
      const result = await publisher.publishToMultiplePlatforms(id, platforms, {
        validateBeforePublish,
        autoFixContent,
        dryRun
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error publishing to multiple platforms:", error);
      res.status(500).json({ message: "Failed to publish to platforms", error: (error as Error).message });
    }
  });

  // Content validation for publishing
  app.get('/api/content/:id/validate', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { platforms } = req.query;
      const userId = req.user.id;
      
      // Verify ownership
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const content = await storage.getContentById(id);
      if (!content || content.businessId !== business.id) {
        return res.status(404).json({ message: "Content not found or unauthorized" });
      }

      const publisher = new EnhancedPublisher(business.id);
      const platformsToValidate = platforms 
        ? (platforms as string).split(',') 
        : ['facebook', 'instagram', 'linkedin', 'twitter', 'pinterest'];
      
      const validation = await publisher.validateContentForPublishing(id, platformsToValidate as any);
      
      res.json(validation);
    } catch (error) {
      console.error("Error validating content:", error);
      res.status(500).json({ message: "Failed to validate content", error: (error as Error).message });
    }
  });

  // Content preview for all platforms
  app.get('/api/content/:id/preview', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Verify ownership
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const content = await storage.getContentById(id);
      if (!content || content.businessId !== business.id) {
        return res.status(404).json({ message: "Content not found or unauthorized" });
      }

      const publisher = new EnhancedPublisher(business.id);
      const previews = await publisher.previewContentForAllPlatforms(id);
      
      res.json(previews);
    } catch (error) {
      console.error("Error generating content preview:", error);
      res.status(500).json({ message: "Failed to generate preview", error: (error as Error).message });
    }
  });

  // Publishing requirements for connected platforms
  app.get('/api/publishing/requirements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const publisher = new EnhancedPublisher(business.id);
      const requirements = await publisher.getPublishingRequirements();
      
      res.json(requirements);
    } catch (error) {
      console.error("Error getting publishing requirements:", error);
      res.status(500).json({ message: "Failed to get requirements", error: (error as Error).message });
    }
  });

  // Content optimization suggestions
  app.get('/api/content/:id/optimize', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Verify ownership
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const content = await storage.getContentById(id);
      if (!content || content.businessId !== business.id) {
        return res.status(404).json({ message: "Content not found or unauthorized" });
      }

      const publisher = new EnhancedPublisher(business.id);
      const suggestions = await publisher.getContentOptimizationSuggestions(id);
      
      res.json(suggestions);
    } catch (error) {
      console.error("Error getting optimization suggestions:", error);
      res.status(500).json({ message: "Failed to get suggestions", error: (error as Error).message });
    }
  });

  // Enhanced content scheduling with validation
  app.post('/api/content/:id/schedule-enhanced', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedBody = scheduleEnhancedSchema.parse(req.body);
      const { scheduledFor, platforms } = validatedBody;
      const userId = req.user.id;
      
      // Verify ownership
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const content = await storage.getContentById(id);
      if (!content || content.businessId !== business.id) {
        return res.status(404).json({ message: "Content not found or unauthorized" });
      }

      const publisher = new EnhancedPublisher(business.id);
      const result = await publisher.scheduleContent(id, new Date(scheduledFor), platforms);
      
      res.json(result);
    } catch (error) {
      console.error("Error scheduling content:", error);
      res.status(500).json({ message: "Failed to schedule content", error: (error as Error).message });
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
