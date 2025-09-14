import {
  users,
  businesses,
  brandVoices,
  platformConnections,
  content,
  contentAnalytics,
  interactions,
  schedulingSettings,
  socialMediaPosts,
  subscriptionPlans,
  userSubscriptions,
  adminUsers,
  paymentHistory,
  affiliates,
  referrals,
  commissions,
  discountLinks,
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
  type SocialMediaPost,
  type InsertSocialMediaPost,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type UserSubscription,
  type InsertUserSubscription,
  type AdminUser,
  type InsertAdminUser,
  type PaymentHistory,
  type InsertPaymentHistory,
  type Affiliate,
  type InsertAffiliate,
  type Referral,
  type InsertReferral,
  type Commission,
  type InsertCommission,
  type DiscountLink,
  type InsertDiscountLink,
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
  getPlatformConnectionById(id: string): Promise<PlatformConnection | undefined>;
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
  updateContent(id: string, updates: Partial<InsertContent>): Promise<Content | undefined>;
  deleteContent(id: string): Promise<void>;

  // Analytics operations
  upsertContentAnalytics(analytics: InsertContentAnalytics): Promise<ContentAnalytics>;
  getAnalyticsByContentId(contentId: string): Promise<ContentAnalytics | undefined>;

  // Interaction operations
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  getInteractionsByBusinessId(businessId: string, limit?: number, offset?: number): Promise<Interaction[]>;
  markInteractionAsRead(id: string): Promise<void>;
  updateInteractionReply(id: string, reply: string): Promise<Interaction | undefined>;

  // Social media post operations
  createSocialMediaPost(post: InsertSocialMediaPost): Promise<SocialMediaPost>;
  getSocialMediaPostsByBusinessId(businessId: string, limit?: number, offset?: number): Promise<SocialMediaPost[]>;
  getSocialMediaPostById(id: string): Promise<SocialMediaPost | undefined>;
  updateSocialMediaPost(id: string, updates: Partial<InsertSocialMediaPost>): Promise<SocialMediaPost | undefined>;
  deleteSocialMediaPost(id: string): Promise<void>;

  // Platform connection helper methods
  getAllActivePlatformConnections(): Promise<PlatformConnection[]>;

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

  // Subscription operations
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  updateSubscriptionPlan(id: string, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined>;

  // User subscription operations
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  getUserSubscription(userId: string): Promise<UserSubscription | undefined>;
  getUserSubscriptionById(id: string): Promise<UserSubscription | undefined>;
  updateUserSubscription(id: string, subscription: Partial<InsertUserSubscription>): Promise<UserSubscription | undefined>;
  getAllActiveSubscriptions(): Promise<UserSubscription[]>;
  getTrialExpiringSubscriptions(daysAhead: number): Promise<UserSubscription[]>;

  // Admin operations
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  getAdminUser(userId: string): Promise<AdminUser | undefined>;
  getAllUsers(limit?: number, offset?: number): Promise<User[]>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeTrials: number;
    paidSubscriptions: number;
    churnedUsers: number;
  }>;

  // Trial management operations
  getExpiringTrials(startDate: Date, endDate: Date): Promise<UserSubscription[]>;
  getExpiredTrials(currentDate: Date): Promise<UserSubscription[]>;
  markTrialReminderSent(subscriptionId: string): Promise<void>;
  markTrialExpirationNotificationSent(subscriptionId: string): Promise<void>;
  countTrialsByStatus(status: string | 'all'): Promise<number>;
  updateSubscriptionStatus(subscriptionId: string, status: string): Promise<UserSubscription | undefined>;
  getUserById(userId: string): Promise<User | undefined>;

  // Payment history operations
  createPaymentHistory(payment: InsertPaymentHistory): Promise<PaymentHistory>;
  getPaymentHistoryByUser(userId: string): Promise<PaymentHistory[]>;
  getRevenueStats(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    monthlyRecurring: number;
    annualRecurring: number;
    averagePerUser: number;
  }>;

  // Affiliate operations
  createAffiliate(affiliate: InsertAffiliate): Promise<Affiliate>;
  getAffiliateByUserId(userId: string): Promise<Affiliate | undefined>;
  getAffiliateByCode(code: string): Promise<Affiliate | undefined>;
  updateAffiliate(id: string, affiliate: Partial<InsertAffiliate>): Promise<Affiliate | undefined>;
  getAllAffiliates(): Promise<Affiliate[]>;

  // Referral operations
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralsByAffiliate(affiliateId: string): Promise<Referral[]>;
  updateReferralStatus(id: string, status: string, conversionDate?: Date): Promise<Referral | undefined>;

  // Commission operations
  createCommission(commission: InsertCommission): Promise<Commission>;
  getCommissionsByAffiliate(affiliateId: string): Promise<Commission[]>;
  updateCommissionStatus(id: string, status: string, paidAt?: Date): Promise<Commission | undefined>;
  getUnpaidCommissions(): Promise<Commission[]>;

  // Discount link operations
  createDiscountLink(link: InsertDiscountLink): Promise<DiscountLink>;
  getDiscountLinkByCode(code: string): Promise<DiscountLink | undefined>;
  getAllDiscountLinks(): Promise<DiscountLink[]>;
  updateDiscountLink(id: string, link: Partial<InsertDiscountLink>): Promise<DiscountLink | undefined>;
  incrementDiscountLinkUsage(id: string): Promise<DiscountLink | undefined>;
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

    // Auto-create a business for new users if they don't have one
    const existingBusiness = await this.getBusinessByUserId(user.id);
    if (!existingBusiness) {
      const businessName = userData.firstName 
        ? `${userData.firstName}'s Business`
        : `${userData.email?.split('@')[0] || 'My'} Business`;
      
      await this.createBusiness({
        userId: user.id,
        name: businessName,
        industry: "Other",
        description: "Default business profile created during onboarding.",
      });
    }

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

  async getPlatformConnectionById(id: string): Promise<PlatformConnection | undefined> {
    const [connection] = await db.select().from(platformConnections).where(eq(platformConnections.id, id));
    return connection;
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

  async updateContent(id: string, updates: Partial<InsertContent>): Promise<Content | undefined> {
    const [updatedContent] = await db
      .update(content)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(content.id, id))
      .returning();
    return updatedContent;
  }

  async deleteContent(id: string): Promise<void> {
    await db.delete(content).where(eq(content.id, id));
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

  async getInteractionsByBusinessId(businessId: string, limit: number = 50, offset: number = 0): Promise<Interaction[]> {
    return await db
      .select()
      .from(interactions)
      .where(eq(interactions.businessId, businessId))
      .orderBy(desc(interactions.createdAt))
      .limit(limit)
      .offset(offset);
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

  // Subscription plan operations
  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [newPlan] = await db.insert(subscriptionPlans).values(plan).returning();
    return newPlan;
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.price);
  }

  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.price);
  }

  async updateSubscriptionPlan(id: string, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    const [updated] = await db.update(subscriptionPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return updated;
  }

  // User subscription operations
  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    const [newSubscription] = await db.insert(userSubscriptions).values(subscription).returning();
    return newSubscription;
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);
    return subscription;
  }

  async getUserSubscriptionById(id: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.id, id));
    return subscription;
  }

  async updateUserSubscription(id: string, subscription: Partial<InsertUserSubscription>): Promise<UserSubscription | undefined> {
    const [updated] = await db.update(userSubscriptions)
      .set({ ...subscription, updatedAt: new Date() })
      .where(eq(userSubscriptions.id, id))
      .returning();
    return updated;
  }

  async getAllActiveSubscriptions(): Promise<UserSubscription[]> {
    return await db.select().from(userSubscriptions)
      .where(or(
        eq(userSubscriptions.status, "active"),
        eq(userSubscriptions.status, "trialing")
      ));
  }

  async getTrialExpiringSubscriptions(daysAhead: number): Promise<UserSubscription[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return await db.select().from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.status, "trialing"),
        sql`${userSubscriptions.trialEndsAt} <= ${futureDate}`
      ));
  }

  // Admin operations
  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [newAdmin] = await db.insert(adminUsers).values(admin).returning();
    return newAdmin;
  }

  async getAdminUser(userId: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers)
      .where(and(
        eq(adminUsers.userId, userId),
        eq(adminUsers.isActive, true)
      ));
    return admin;
  }

  async getAllUsers(limit: number = 100, offset: number = 0): Promise<User[]> {
    return await db.select().from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeTrials: number;
    paidSubscriptions: number;
    churnedUsers: number;
  }> {
    const [totalResult] = await db.select({ count: count() }).from(users);
    const [trialsResult] = await db.select({ count: count() }).from(userSubscriptions)
      .where(eq(userSubscriptions.status, "trialing"));
    const [paidResult] = await db.select({ count: count() }).from(userSubscriptions)
      .where(eq(userSubscriptions.status, "active"));
    const [churnedResult] = await db.select({ count: count() }).from(userSubscriptions)
      .where(eq(userSubscriptions.status, "canceled"));

    return {
      totalUsers: totalResult.count,
      activeTrials: trialsResult.count,
      paidSubscriptions: paidResult.count,
      churnedUsers: churnedResult.count,
    };
  }

  // Payment history operations
  async createPaymentHistory(payment: InsertPaymentHistory): Promise<PaymentHistory> {
    const [newPayment] = await db.insert(paymentHistory).values(payment).returning();
    return newPayment;
  }

  async getPaymentHistoryByUser(userId: string): Promise<PaymentHistory[]> {
    return await db.select().from(paymentHistory)
      .where(eq(paymentHistory.userId, userId))
      .orderBy(desc(paymentHistory.createdAt));
  }

  async getRevenueStats(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    monthlyRecurring: number;
    annualRecurring: number;
    averagePerUser: number;
  }> {
    // Get successful payments in date range
    const payments = await db.select().from(paymentHistory)
      .where(and(
        eq(paymentHistory.status, "succeeded"),
        sql`${paymentHistory.createdAt} >= ${startDate}`,
        sql`${paymentHistory.createdAt} <= ${endDate}`
      ));

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Get active subscriptions for MRR/ARR calculation
    const activeSubscriptions = await this.getAllActiveSubscriptions();
    const monthlyRecurring = activeSubscriptions
      .filter(s => s.planId.includes("monthly"))
      .length * 29900; // $299 in cents
    const annualRecurring = activeSubscriptions
      .filter(s => s.planId.includes("annual"))
      .length * 249900; // $2499 in cents

    const totalActiveUsers = activeSubscriptions.length;
    const averagePerUser = totalActiveUsers > 0 ? totalRevenue / totalActiveUsers : 0;

    return {
      totalRevenue,
      monthlyRecurring,
      annualRecurring,
      averagePerUser,
    };
  }

  // Affiliate operations
  async createAffiliate(affiliate: InsertAffiliate): Promise<Affiliate> {
    const [newAffiliate] = await db.insert(affiliates).values(affiliate).returning();
    return newAffiliate;
  }

  async getAffiliateByUserId(userId: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates)
      .where(eq(affiliates.userId, userId));
    return affiliate;
  }

  async getAffiliateByCode(code: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates)
      .where(eq(affiliates.affiliateCode, code));
    return affiliate;
  }

  async updateAffiliate(id: string, affiliate: Partial<InsertAffiliate>): Promise<Affiliate | undefined> {
    const [updated] = await db.update(affiliates)
      .set({ ...affiliate, updatedAt: new Date() })
      .where(eq(affiliates.id, id))
      .returning();
    return updated;
  }

  async getAllAffiliates(): Promise<Affiliate[]> {
    return await db.select().from(affiliates)
      .orderBy(desc(affiliates.totalCommissions));
  }

  // Referral operations
  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values(referral).returning();
    return newReferral;
  }

  async getReferralsByAffiliate(affiliateId: string): Promise<Referral[]> {
    return await db.select().from(referrals)
      .where(eq(referrals.affiliateId, affiliateId))
      .orderBy(desc(referrals.createdAt));
  }

  async updateReferralStatus(id: string, status: string, conversionDate?: Date): Promise<Referral | undefined> {
    const [updated] = await db.update(referrals)
      .set({ status, conversionDate })
      .where(eq(referrals.id, id))
      .returning();
    return updated;
  }

  // Commission operations
  async createCommission(commission: InsertCommission): Promise<Commission> {
    const [newCommission] = await db.insert(commissions).values(commission).returning();
    return newCommission;
  }

  async getCommissionsByAffiliate(affiliateId: string): Promise<Commission[]> {
    return await db.select().from(commissions)
      .where(eq(commissions.affiliateId, affiliateId))
      .orderBy(desc(commissions.createdAt));
  }

  async updateCommissionStatus(id: string, status: string, paidAt?: Date): Promise<Commission | undefined> {
    const [updated] = await db.update(commissions)
      .set({ status, paidAt })
      .where(eq(commissions.id, id))
      .returning();
    return updated;
  }

  async getUnpaidCommissions(): Promise<Commission[]> {
    return await db.select().from(commissions)
      .where(eq(commissions.status, "pending"))
      .orderBy(desc(commissions.createdAt));
  }

  // Discount link operations
  async createDiscountLink(link: InsertDiscountLink): Promise<DiscountLink> {
    const [newLink] = await db.insert(discountLinks).values(link).returning();
    return newLink;
  }

  async getDiscountLinkByCode(code: string): Promise<DiscountLink | undefined> {
    const [link] = await db.select().from(discountLinks)
      .where(and(
        eq(discountLinks.linkCode, code),
        eq(discountLinks.isActive, true)
      ));
    return link;
  }

  async getAllDiscountLinks(): Promise<DiscountLink[]> {
    return await db.select().from(discountLinks)
      .orderBy(desc(discountLinks.createdAt));
  }

  async updateDiscountLink(id: string, link: Partial<InsertDiscountLink>): Promise<DiscountLink | undefined> {
    const [updated] = await db.update(discountLinks)
      .set({ ...link, updatedAt: new Date() })
      .where(eq(discountLinks.id, id))
      .returning();
    return updated;
  }

  async incrementDiscountLinkUsage(id: string): Promise<DiscountLink | undefined> {
    const [updated] = await db.update(discountLinks)
      .set({ 
        usageCount: sql`${discountLinks.usageCount} + 1`,
        updatedAt: new Date() 
      })
      .where(eq(discountLinks.id, id))
      .returning();
    return updated;
  }

  // Social media post operations
  async createSocialMediaPost(post: InsertSocialMediaPost): Promise<SocialMediaPost> {
    const [newPost] = await db.insert(socialMediaPosts).values(post).returning();
    return newPost;
  }

  async getSocialMediaPostsByBusinessId(businessId: string, limit: number = 50, offset: number = 0): Promise<SocialMediaPost[]> {
    return await db.select().from(socialMediaPosts)
      .where(eq(socialMediaPosts.businessId, businessId))
      .orderBy(desc(socialMediaPosts.publishedAt))
      .limit(limit)
      .offset(offset);
  }

  async getSocialMediaPostById(id: string): Promise<SocialMediaPost | undefined> {
    const [post] = await db.select().from(socialMediaPosts)
      .where(eq(socialMediaPosts.id, id));
    return post;
  }

  async updateSocialMediaPost(id: string, updates: Partial<InsertSocialMediaPost>): Promise<SocialMediaPost | undefined> {
    const [updated] = await db.update(socialMediaPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(socialMediaPosts.id, id))
      .returning();
    return updated;
  }

  async deleteSocialMediaPost(id: string): Promise<void> {
    await db.delete(socialMediaPosts).where(eq(socialMediaPosts.id, id));
  }

  async getAllActivePlatformConnections(): Promise<PlatformConnection[]> {
    return await db.select().from(platformConnections)
      .where(eq(platformConnections.isActive, true))
      .orderBy(desc(platformConnections.createdAt));
  }

  // Trial management operations
  async getExpiringTrials(startDate: Date, endDate: Date): Promise<UserSubscription[]> {
    return await db.select().from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.status, "trialing"),
        sql`${userSubscriptions.trialEndsAt} >= ${startDate}`,
        sql`${userSubscriptions.trialEndsAt} <= ${endDate}`,
        sql`${userSubscriptions.reminderSentAt} IS NULL` // Only get trials that haven't been reminded
      ))
      .orderBy(userSubscriptions.trialEndsAt);
  }

  async getExpiredTrials(currentDate: Date): Promise<UserSubscription[]> {
    return await db.select().from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.status, "trialing"),
        sql`${userSubscriptions.trialEndsAt} < ${currentDate}`,
        sql`${userSubscriptions.expirationNotifiedAt} IS NULL` // Only get trials that haven't been notified
      ))
      .orderBy(userSubscriptions.trialEndsAt);
  }

  async markTrialReminderSent(subscriptionId: string): Promise<void> {
    await db.update(userSubscriptions)
      .set({ reminderSentAt: new Date() })
      .where(eq(userSubscriptions.id, subscriptionId));
    console.log(`[storage] Trial reminder marked as sent for subscription ${subscriptionId}`);
  }

  async markTrialExpirationNotificationSent(subscriptionId: string): Promise<void> {
    await db.update(userSubscriptions)
      .set({ expirationNotifiedAt: new Date() })
      .where(eq(userSubscriptions.id, subscriptionId));
    console.log(`[storage] Trial expiration notification marked as sent for subscription ${subscriptionId}`);
  }

  async countTrialsByStatus(status: string | 'all'): Promise<number> {
    if (status === 'all') {
      const [result] = await db.select({ count: count() }).from(userSubscriptions);
      return result.count;
    }
    
    const [result] = await db.select({ count: count() }).from(userSubscriptions)
      .where(eq(userSubscriptions.status, status));
    return result.count;
  }

  async updateSubscriptionStatus(subscriptionId: string, status: string): Promise<UserSubscription | undefined> {
    const [updated] = await db.update(userSubscriptions)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, subscriptionId))
      .returning();
    return updated;
  }

  async getUserById(userId: string): Promise<User | undefined> {
    return this.getUser(userId);
  }
}

export const storage = new DatabaseStorage();
