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
