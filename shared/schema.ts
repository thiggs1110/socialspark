import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business profiles
export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  industry: varchar("industry"),
  website: varchar("website"),
  googleBusinessUrl: varchar("google_business_url"),
  description: text("description"),
  address: varchar("address"),
  phone: varchar("phone"),
  hours: jsonb("hours"), // Store business hours as JSON
  services: text("services").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Brand voice and preferences
export const brandVoices = pgTable("brand_voices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  tone: varchar("tone").notNull(), // professional, fun, witty, etc.
  voice: varchar("voice").notNull(), // first-person, third-person
  brandAdjectives: varchar("brand_adjectives").array(),
  topicsToFocus: text("topics_to_focus").array(),
  topicsToAvoid: text("topics_to_avoid").array(),
  useEmojis: boolean("use_emojis").default(true),
  imageStyle: varchar("image_style"),
  contentMix: jsonb("content_mix"), // Educational, Promotional, etc. percentages
  customInstructions: text("custom_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social media platform connections
export const platformConnections = pgTable("platform_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  platform: varchar("platform").notNull(), // facebook, instagram, linkedin, twitter, pinterest, blog, email
  platformUserId: varchar("platform_user_id"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings"), // Platform-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content types enum
export const contentTypeEnum = pgEnum("content_type", ["educational", "promotional", "community", "humorous", "news", "behind_scenes"]);

// Content status enum
export const contentStatusEnum = pgEnum("content_status", ["draft", "pending_approval", "approved", "rejected", "published", "failed"]);

// Generated content
export const content = pgTable("content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  platform: varchar("platform").notNull(),
  contentType: contentTypeEnum("content_type").notNull(),
  status: contentStatusEnum("status").default("draft"),
  title: varchar("title"),
  content: text("content").notNull(),
  hashtags: varchar("hashtags").array(),
  imageUrl: varchar("image_url"),
  imagePrompt: text("image_prompt"),
  scheduledFor: timestamp("scheduled_for"),
  publishedAt: timestamp("published_at"),
  platformPostId: varchar("platform_post_id"), // ID from the social media platform
  metadata: jsonb("metadata"), // Additional platform-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content performance analytics
export const contentAnalytics = pgTable("content_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => content.id, { onDelete: "cascade" }),
  platform: varchar("platform").notNull(),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  comments: integer("comments").default(0),
  clicks: integer("clicks").default(0),
  engagementRate: integer("engagement_rate").default(0), // Stored as percentage * 100
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Social media interactions (comments, DMs, mentions)
export const interactions = pgTable("interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  platform: varchar("platform").notNull(),
  interactionType: varchar("interaction_type").notNull(), // comment, dm, mention
  platformInteractionId: varchar("platform_interaction_id").notNull(),
  fromUser: varchar("from_user").notNull(),
  fromUserDisplayName: varchar("from_user_display_name"),
  fromUserProfilePic: varchar("from_user_profile_pic"),
  message: text("message").notNull(),
  contentId: varchar("content_id").references(() => content.id),
  isRead: boolean("is_read").default(false),
  isReplied: boolean("is_replied").default(false),
  suggestedReply: text("suggested_reply"),
  actualReply: text("actual_reply"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Scheduling preferences
export const schedulingSettings = pgTable("scheduling_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  platform: varchar("platform").notNull(),
  frequency: integer("frequency").default(3), // posts per week
  preferredTimes: varchar("preferred_times").array(), // ["09:00", "14:00", "18:00"]
  timeZone: varchar("time_zone").default("UTC"),
  autoApprove: boolean("auto_approve").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ one, many }) => ({
  business: one(businesses, {
    fields: [users.id],
    references: [businesses.userId],
  }),
}));

export const businessRelations = relations(businesses, ({ one, many }) => ({
  user: one(users, {
    fields: [businesses.userId],
    references: [users.id],
  }),
  brandVoice: one(brandVoices, {
    fields: [businesses.id],
    references: [brandVoices.businessId],
  }),
  platformConnections: many(platformConnections),
  content: many(content),
  interactions: many(interactions),
  schedulingSettings: many(schedulingSettings),
}));

export const brandVoiceRelations = relations(brandVoices, ({ one }) => ({
  business: one(businesses, {
    fields: [brandVoices.businessId],
    references: [businesses.id],
  }),
}));

export const platformConnectionRelations = relations(platformConnections, ({ one }) => ({
  business: one(businesses, {
    fields: [platformConnections.businessId],
    references: [businesses.id],
  }),
}));

export const contentRelations = relations(content, ({ one, many }) => ({
  business: one(businesses, {
    fields: [content.businessId],
    references: [businesses.id],
  }),
  analytics: one(contentAnalytics, {
    fields: [content.id],
    references: [contentAnalytics.contentId],
  }),
  interactions: many(interactions),
}));

export const contentAnalyticsRelations = relations(contentAnalytics, ({ one }) => ({
  content: one(content, {
    fields: [contentAnalytics.contentId],
    references: [content.id],
  }),
}));

export const interactionRelations = relations(interactions, ({ one }) => ({
  business: one(businesses, {
    fields: [interactions.businessId],
    references: [businesses.id],
  }),
  content: one(content, {
    fields: [interactions.contentId],
    references: [content.id],
  }),
}));

export const schedulingSettingsRelations = relations(schedulingSettings, ({ one }) => ({
  business: one(businesses, {
    fields: [schedulingSettings.businessId],
    references: [businesses.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBrandVoiceSchema = createInsertSchema(brandVoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlatformConnectionSchema = createInsertSchema(platformConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentSchema = createInsertSchema(content).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentAnalyticsSchema = createInsertSchema(contentAnalytics).omit({
  id: true,
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  createdAt: true,
});

export const insertSchedulingSettingsSchema = createInsertSchema(schedulingSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type BrandVoice = typeof brandVoices.$inferSelect;
export type InsertBrandVoice = z.infer<typeof insertBrandVoiceSchema>;
export type PlatformConnection = typeof platformConnections.$inferSelect;
export type InsertPlatformConnection = z.infer<typeof insertPlatformConnectionSchema>;
export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
export type ContentAnalytics = typeof contentAnalytics.$inferSelect;
export type InsertContentAnalytics = z.infer<typeof insertContentAnalyticsSchema>;
export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type SchedulingSettings = typeof schedulingSettings.$inferSelect;
export type InsertSchedulingSettings = z.infer<typeof insertSchedulingSettingsSchema>;

// Subscription plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // "monthly", "annual", "monthly_discount", "annual_discount"
  displayName: varchar("display_name").notNull(), // "Monthly Plan", "Annual Plan"
  price: integer("price").notNull(), // in cents (29900 for $299)
  interval: varchar("interval").notNull(), // "month" | "year"
  trialDays: integer("trial_days").default(7),
  isActive: boolean("is_active").default(true),
  stripeProductId: varchar("stripe_product_id"),
  stripePriceId: varchar("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User subscriptions
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripeCustomerId: varchar("stripe_customer_id"),
  status: varchar("status").notNull(), // "trialing" | "active" | "past_due" | "canceled" | "unpaid"
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  affiliateId: varchar("affiliate_id"), // Track referrals - will add FK after tables defined
  discountLinkId: varchar("discount_link_id"), // Track discount usage - will add FK after tables defined
  reminderSentAt: timestamp("reminder_sent_at"), // Track when trial reminder was sent
  expirationNotifiedAt: timestamp("expiration_notified_at"), // Track when expiration notification was sent
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin users
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull(), // "super_admin" | "admin" | "analyst"
  permissions: varchar("permissions").array(), // ["view_users", "manage_billing", etc.]
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment history
export const paymentHistory = pgTable("payment_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: varchar("subscription_id").references(() => userSubscriptions.id),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  amount: integer("amount").notNull(), // in cents
  currency: varchar("currency").default("usd"),
  status: varchar("status").notNull(), // "succeeded" | "failed" | "pending"
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Affiliates
export const affiliates = pgTable("affiliates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  affiliateCode: varchar("affiliate_code").notNull().unique(), // unique referral code
  commissionRate: integer("commission_rate").default(30), // percentage as integer (30 = 30%)
  totalReferrals: integer("total_referrals").default(0),
  totalCommissions: integer("total_commissions").default(0), // in cents
  unpaidCommissions: integer("unpaid_commissions").default(0), // in cents
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Referrals tracking
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id, { onDelete: "cascade" }),
  referredUserId: varchar("referred_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: varchar("subscription_id").references(() => userSubscriptions.id),
  status: varchar("status").notNull(), // "pending" | "converted" | "commission_paid"
  conversionDate: timestamp("conversion_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Commission payments
export const commissions = pgTable("commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id, { onDelete: "cascade" }),
  referralId: varchar("referral_id").notNull().references(() => referrals.id),
  amount: integer("amount").notNull(), // in cents
  paymentMethod: varchar("payment_method"), // "stripe" | "paypal" | "manual"
  paymentReference: varchar("payment_reference"), // external payment ID
  status: varchar("status").notNull(), // "pending" | "paid" | "failed"
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Custom discount links
export const discountLinks = pgTable("discount_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  linkCode: varchar("link_code").notNull().unique(), // unique code for the URL
  name: varchar("name").notNull(), // admin-friendly name
  description: text("description"),
  monthlyPrice: integer("monthly_price"), // custom monthly price in cents (19900 for $199)
  annualPrice: integer("annual_price"), // custom annual price in cents (199900 for $1999)
  usageLimit: integer("usage_limit"), // null = unlimited
  usageCount: integer("usage_count").default(0),
  expiresAt: timestamp("expires_at"), // null = never expires
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for new tables
export const subscriptionPlanRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(userSubscriptions),
}));

export const userSubscriptionRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [userSubscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  affiliate: one(affiliates, {
    fields: [userSubscriptions.affiliateId],
    references: [affiliates.id],
  }),
  discountLink: one(discountLinks, {
    fields: [userSubscriptions.discountLinkId],
    references: [discountLinks.id],
  }),
}));

export const adminUserRelations = relations(adminUsers, ({ one }) => ({
  user: one(users, {
    fields: [adminUsers.userId],
    references: [users.id],
  }),
}));

export const affiliateRelations = relations(affiliates, ({ one, many }) => ({
  user: one(users, {
    fields: [affiliates.userId],
    references: [users.id],
  }),
  referrals: many(referrals),
  commissions: many(commissions),
  subscriptions: many(userSubscriptions),
}));

export const referralRelations = relations(referrals, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [referrals.affiliateId],
    references: [affiliates.id],
  }),
  referredUser: one(users, {
    fields: [referrals.referredUserId],
    references: [users.id],
  }),
  subscription: one(userSubscriptions, {
    fields: [referrals.subscriptionId],
    references: [userSubscriptions.id],
  }),
}));

export const commissionRelations = relations(commissions, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [commissions.affiliateId],
    references: [affiliates.id],
  }),
  referral: one(referrals, {
    fields: [commissions.referralId],
    references: [referrals.id],
  }),
}));

export const discountLinkRelations = relations(discountLinks, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [discountLinks.createdBy],
    references: [users.id],
  }),
  subscriptions: many(userSubscriptions),
}));

// Insert schemas for new tables
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).omit({
  id: true,
  createdAt: true,
});

export const insertAffiliateSchema = createInsertSchema(affiliates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({
  id: true,
  createdAt: true,
});

export const insertDiscountLinkSchema = createInsertSchema(discountLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for new tables
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;
export type Affiliate = typeof affiliates.$inferSelect;
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type DiscountLink = typeof discountLinks.$inferSelect;
export type InsertDiscountLink = z.infer<typeof insertDiscountLinkSchema>;
