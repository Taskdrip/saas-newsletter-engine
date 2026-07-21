import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  name: text("name").notNull(),
  subject: text("subject"),
  previewText: text("preview_text"),
  fromName: text("from_name"),
  fromEmail: text("from_email"),
  replyTo: text("reply_to"),
  type: text("type").notNull().default("regular"),
  status: text("status").notNull().default("draft"),
  templateId: integer("template_id"),
  listIds: integer("list_ids").array().default([]),
  segmentIds: integer("segment_ids").array().default([]),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  totalRecipients: integer("total_recipients").notNull().default(0),
  listmonkCampaignId: integer("listmonk_campaign_id"),
  listmonkListId: integer("listmonk_list_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;

export const campaignStatsTable = pgTable("campaign_stats", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().unique(),
  sent: integer("sent").notNull().default(0),
  delivered: integer("delivered").notNull().default(0),
  opened: integer("opened").notNull().default(0),
  clicked: integer("clicked").notNull().default(0),
  bounced: integer("bounced").notNull().default(0),
  unsubscribed: integer("unsubscribed").notNull().default(0),
  complained: integer("complained").notNull().default(0),
  revenue: integer("revenue").notNull().default(0),
  opensByDevice: jsonb("opens_by_device").default({}),
  opensByCountry: jsonb("opens_by_country").default({}),
  topLinks: jsonb("top_links").default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CampaignStat = typeof campaignStatsTable.$inferSelect;
