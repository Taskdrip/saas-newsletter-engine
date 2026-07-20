import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const formsTable = pgTable("forms", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("embedded"),
  status: text("status").notNull().default("active"),
  listIds: integer("list_ids").array().default([]),
  submissionCount: integer("submission_count").notNull().default(0),
  embedCode: text("embed_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFormSchema = createInsertSchema(formsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof formsTable.$inferSelect;

export const websitesTable = pgTable("websites", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  status: text("status").notNull().default("unverified"),
  trackingScript: text("tracking_script"),
  isVerified: boolean("is_verified").notNull().default(false),
  pageviewsLast30d: integer("pageviews_last_30d").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWebsiteSchema = createInsertSchema(websitesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWebsite = z.infer<typeof insertWebsiteSchema>;
export type Website = typeof websitesTable.$inferSelect;
