import {
  users,
  businesses,
  brandVoices,
  platformConnections,
  content,
  contentAnalytics,
  interactions,
  schedulingSettings,
  type User,
  type UpsertUser,
  type Business,
  type InsertBusiness,
  type BrandVoice,
  type InsertBrandVoice,
  type PlatformConnection,
  type InsertPlatformConnection,
  type Content,
  type InsertContent,
  type ContentAnalytics,
  type InsertContentAnalytics,
  type Interaction,
  type InsertInteraction,
  type SchedulingSettings,
  type InsertSchedulingSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Business operations
  createBusiness(business: InsertBusiness): Promise<Business>;
  getBusinessByUserId(userId: string): Promise<Business | undefined>;
  updateBusiness(id: string, business: Partial<InsertBusiness>): Promise<Business | undefined>;

  // Brand voice operations
  createBrandVoice(brandVoice: InsertBrandVoice): Promise<BrandVoice>;
  getBrandVoiceByBusinessId(businessId: string): Promise<BrandVoice | undefined>;
  updateBrandVoice(businessId: string, brandVoice: Partial<InsertBrandVoice>): Promise<BrandVoice | undefined>;

  // Platform connection operations
  createPlatformConnection(connection: InsertPlatformConnection): Promise<PlatformConnection>;
  getPlatformConnectionsByBusinessId(businessId: string): Promise<PlatformConnection[]>;
  updatePlatformConnection(id: string, connection: Partial<InsertPlatformConnection>): Promise<PlatformConnection | undefined>;
  deletePlatformConnection(id: string): Promise<void>;

  // Content operations
  createContent(content: InsertContent): Promise<Content>;
  getContentByBusinessId(businessId: string, limit?: number): Promise<Content[]>;
  getPendingContent(businessId: string): Promise<Content[]>;
  getScheduledContent(businessId: string, startDate?: Date, endDate?: Date): Promise<Content[]>;
  getPublishingQueue(businessId: string): Promise<Content[]>;
  getAllDueContent(): Promise<Content[]>;
  updateContentStatus(id: string, status: string, publishedAt?: Date): Promise<Content | undefined>;
  getContentById(id: string): Promise<Content | undefined>;

  // Analytics operations
  upsertContentAnalytics(analytics: InsertContentAnalytics): Promise<ContentAnalytics>;
  getAnalyticsByContentId(contentId: string): Promise<ContentAnalytics | undefined>;

  // Interaction operations
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  getInteractionsByBusinessId(businessId: string, unreadOnly?: boolean): Promise<Interaction[]>;
  markInteractionAsRead(id: string): Promise<void>;
  updateInteractionReply(id: string, reply: string): Promise<Interaction | undefined>;

  // Scheduling operations
  createSchedulingSettings(settings: InsertSchedulingSettings): Promise<SchedulingSettings>;
  getSchedulingSettingsByBusinessId(businessId: string): Promise<SchedulingSettings[]>;
  updateSchedulingSettings(id: string, settings: Partial<InsertSchedulingSettings>): Promise<SchedulingSettings | undefined>;

  // Dashboard stats
  getDashboardStats(businessId: string): Promise<{
    weeklyPosts: number;
    engagementRate: number;
    activePlatforms: number;
    pendingApprovals: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Business operations
  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [newBusiness] = await db.insert(businesses).values(business).returning();
    return newBusiness;
  }

  async getBusinessByUserId(userId: string): Promise<Business | undefined> {
    // First, try to get a business with a brand voice configured
    const businessWithBrandVoice = await db
      .select()
      .from(businesses)
      .innerJoin(brandVoices, eq(businesses.id, brandVoices.businessId))
      .where(eq(businesses.userId, userId))
      .limit(1);
    
    if (businessWithBrandVoice.length > 0) {
      return businessWithBrandVoice[0].businesses;
    }
    
    // Fallback to any business for this user
    const [business] = await db.select().from(businesses).where(eq(businesses.userId, userId));
    return business;
  }

  async getBusinessById(businessId: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    return business;
  }

  async updateBusiness(id: string, business: Partial<InsertBusiness>): Promise<Business | undefined> {
    const [updatedBusiness] = await db
      .update(businesses)
      .set({ ...business, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();
    return updatedBusiness;
  }

  // Brand voice operations
  async createBrandVoice(brandVoice: InsertBrandVoice): Promise<BrandVoice> {
    const [newBrandVoice] = await db.insert(brandVoices).values(brandVoice).returning();
    return newBrandVoice;
  }

  async getBrandVoiceByBusinessId(businessId: string): Promise<BrandVoice | undefined> {
    const [brandVoice] = await db.select().from(brandVoices).where(eq(brandVoices.businessId, businessId));
    return brandVoice;
  }

  async updateBrandVoice(businessId: string, brandVoice: Partial<InsertBrandVoice>): Promise<BrandVoice | undefined> {
    const [updatedBrandVoice] = await db
      .update(brandVoices)
      .set({ ...brandVoice, updatedAt: new Date() })
      .where(eq(brandVoices.businessId, businessId))
      .returning();
    return updatedBrandVoice;
  }

  // Platform connection operations
  async createPlatformConnection(connection: InsertPlatformConnection): Promise<PlatformConnection> {
    const [newConnection] = await db.insert(platformConnections).values(connection).returning();
    return newConnection;
  }

  async getPlatformConnectionsByBusinessId(businessId: string): Promise<PlatformConnection[]> {
    return await db.select().from(platformConnections).where(eq(platformConnections.businessId, businessId));
  }

  async updatePlatformConnection(id: string, connection: Partial<InsertPlatformConnection>): Promise<PlatformConnection | undefined> {
    const [updatedConnection] = await db
      .update(platformConnections)
      .set({ ...connection, updatedAt: new Date() })
      .where(eq(platformConnections.id, id))
      .returning();
    return updatedConnection;
  }

  async deletePlatformConnection(id: string): Promise<void> {
    await db.delete(platformConnections).where(eq(platformConnections.id, id));
  }

  // Content operations
  async createContent(contentData: InsertContent): Promise<Content> {
    const [newContent] = await db.insert(content).values(contentData).returning();
    return newContent;
  }

  async getContentByBusinessId(businessId: string, limit: number = 20): Promise<Content[]> {
    return await db
      .select()
      .from(content)
      .where(eq(content.businessId, businessId))
      .orderBy(desc(content.createdAt))
      .limit(limit);
  }

  async getPendingContent(businessId: string): Promise<Content[]> {
    return await db
      .select()
      .from(content)
      .where(and(eq(content.businessId, businessId), eq(content.status, "pending_approval")))
      .orderBy(desc(content.createdAt));
  }

  async updateContentStatus(id: string, status: string, publishedAt?: Date): Promise<Content | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    if (publishedAt) {
      updateData.publishedAt = publishedAt;
    }

    const [updatedContent] = await db
      .update(content)
      .set(updateData)
      .where(eq(content.id, id))
      .returning();
    return updatedContent;
  }

  async getContentById(id: string): Promise<Content | undefined> {
    const [contentItem] = await db.select().from(content).where(eq(content.id, id));
    return contentItem;
  }

  async getScheduledContent(businessId: string, startDate?: Date, endDate?: Date): Promise<Content[]> {
    let conditions = [
      eq(content.businessId, businessId),
      or(
        eq(content.status, "approved"),
        eq(content.status, "published")
      )
    ];

    // Add date range filtering if provided
    if (startDate) {
      conditions.push(sql`${content.scheduledFor} >= ${startDate.toISOString()}`);
    }
    if (endDate) {
      conditions.push(sql`${content.scheduledFor} <= ${endDate.toISOString()}`);
    }

    return await db
      .select()
      .from(content)
      .where(and(...conditions))
      .orderBy(content.scheduledFor);
  }

  async getPublishingQueue(businessId: string): Promise<Content[]> {
    const now = new Date();
    return await db
      .select()
      .from(content)
      .where(
        and(
          eq(content.businessId, businessId),
          eq(content.status, "approved"),
          sql`${content.scheduledFor} <= ${now.toISOString()}`
        )
      )
      .orderBy(content.scheduledFor);
  }

  async getAllDueContent(): Promise<Content[]> {
    const now = new Date();
    return await db
      .select()
      .from(content)
      .where(
        and(
          eq(content.status, "approved"),
          sql`${content.scheduledFor} <= ${now.toISOString()}`,
          sql`${content.publishedAt} IS NULL`
        )
      )
      .orderBy(content.scheduledFor)
      .limit(100); // Limit to prevent overwhelming the worker
  }

  // Analytics operations
  async upsertContentAnalytics(analytics: InsertContentAnalytics): Promise<ContentAnalytics> {
    const [newAnalytics] = await db
      .insert(contentAnalytics)
      .values(analytics)
      .onConflictDoUpdate({
        target: contentAnalytics.contentId,
        set: {
          ...analytics,
          lastUpdated: new Date(),
        },
      })
      .returning();
    return newAnalytics;
  }

  async getAnalyticsByContentId(contentId: string): Promise<ContentAnalytics | undefined> {
    const [analytics] = await db.select().from(contentAnalytics).where(eq(contentAnalytics.contentId, contentId));
    return analytics;
  }

  // Interaction operations
  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const [newInteraction] = await db.insert(interactions).values(interaction).returning();
    return newInteraction;
  }

  async getInteractionsByBusinessId(businessId: string, unreadOnly: boolean = false): Promise<Interaction[]> {
    const conditions = [eq(interactions.businessId, businessId)];
    if (unreadOnly) {
      conditions.push(eq(interactions.isRead, false));
    }

    return await db
      .select()
      .from(interactions)
      .where(and(...conditions))
      .orderBy(desc(interactions.createdAt));
  }

  async markInteractionAsRead(id: string): Promise<void> {
    await db.update(interactions).set({ isRead: true }).where(eq(interactions.id, id));
  }

  async updateInteractionReply(id: string, reply: string): Promise<Interaction | undefined> {
    const [updatedInteraction] = await db
      .update(interactions)
      .set({ actualReply: reply, isReplied: true, repliedAt: new Date() })
      .where(eq(interactions.id, id))
      .returning();
    return updatedInteraction;
  }

  // Scheduling operations
  async createSchedulingSettings(settings: InsertSchedulingSettings): Promise<SchedulingSettings> {
    const [newSettings] = await db.insert(schedulingSettings).values(settings).returning();
    return newSettings;
  }

  async getSchedulingSettingsByBusinessId(businessId: string): Promise<SchedulingSettings[]> {
    return await db.select().from(schedulingSettings).where(eq(schedulingSettings.businessId, businessId));
  }

  async updateSchedulingSettings(id: string, settings: Partial<InsertSchedulingSettings>): Promise<SchedulingSettings | undefined> {
    const [updatedSettings] = await db
      .update(schedulingSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(schedulingSettings.id, id))
      .returning();
    return updatedSettings;
  }

  // Dashboard stats
  async getDashboardStats(businessId: string): Promise<{
    weeklyPosts: number;
    engagementRate: number;
    activePlatforms: number;
    pendingApprovals: number;
  }> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get weekly posts count
    const [weeklyPostsResult] = await db
      .select({ count: count() })
      .from(content)
      .where(
        and(
          eq(content.businessId, businessId),
          eq(content.status, "published")
        )
      );

    // Get pending approvals count
    const [pendingApprovalsResult] = await db
      .select({ count: count() })
      .from(content)
      .where(
        and(
          eq(content.businessId, businessId),
          eq(content.status, "pending_approval")
        )
      );

    // Get active platforms count
    const [activePlatformsResult] = await db
      .select({ count: count() })
      .from(platformConnections)
      .where(
        and(
          eq(platformConnections.businessId, businessId),
          eq(platformConnections.isActive, true)
        )
      );

    // For now, return a mock engagement rate - in production this would be calculated from analytics
    return {
      weeklyPosts: weeklyPostsResult.count,
      engagementRate: 8.2, // This would be calculated from actual analytics data
      activePlatforms: activePlatformsResult.count,
      pendingApprovals: pendingApprovalsResult.count,
    };
  }
}

export const storage = new DatabaseStorage();
